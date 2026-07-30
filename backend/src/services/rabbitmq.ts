import config from "@/config";
import logger from "@/lib/logger";
import { throwError } from "@/utils/error";
import amqp, {
	Channel,
	ChannelModel,
	ConfirmChannel,
	ConsumeMessage
} from "amqplib";
import { StatusCodes } from "http-status-codes";

export type ExchangeType = "direct" | "topic" | "fanout" | "headers";

export interface RetryConfig {
	enabled: boolean;
	maxRetries?: number; // default 3
	retryDelayMs?: number; // default 5000
}

export interface QueueSetupConfig<T> {
	/**
	 * Shorthand: if `exchange` is omitted, `name` is used as the exchange name.
	 * If `queue` is set but `routingKey` is omitted, `name` is used as the
	 * routing key too. Purely a convenience for simple 1:1 setups — has no
	 * effect on `queue` itself (see below).
	 */
	name?: string;
	exchange?: string; // required unless `name` is provided
	exchangeType?: ExchangeType;
	/**
	 * Omit entirely for a publisher-only instance — no queue is created or
	 * bound, and `.consume()` will throw if called on this instance.
	 */
	queue?: string;
	/** Required if `queue` is set (or derivable from `name`). */
	routingKey?: string;
	dlq?: boolean; // default true
	retry?: RetryConfig; // default disabled
	durable?: boolean; // default true
	prefetchCount?: number; // default 1
	publishConfirm?: "batch" | "single" | boolean; // default false

	onConsume?: (payload: T, raw: ConsumeMessage) => Promise<void>;
	onPublish?: (message: T) => void;
}

/** Fully-resolved internal shape after `name` shorthand is applied. */
interface ResolvedConfig<T> extends QueueSetupConfig<T> {
	exchange: string;
}

export type PublishCallback = (
	err: Error | null,
	info?: { exchange: string; routingKey: string }
) => void;

export type ConsumeEvent =
	| { type: "ack"; message: ConsumeMessage }
	| { type: "retry"; message: ConsumeMessage; attempt: number; error: unknown }
	| { type: "dlq"; message: ConsumeMessage; attempt: number; error: unknown };

export type ConsumeCallback = (event: ConsumeEvent) => void;

/**
 * An abstraction layer over `amqplib` that removes the boilerplate of:
 * - asserting an exchange,
 * - (optionally) asserting a queue and binding it with a routing key,
 * - wiring a dead-letter exchange/queue so failed messages are never lost,
 * - (optional) a delayed retry mechanism using a TTL "parking" queue that
 *   dead-letters back into the main exchange once the delay expires.
 *
 * **Publisher-only vs consumer instances.** Omit `queue` entirely to get a
 * publisher-only instance — it only asserts the exchange, never creates or
 * binds a queue. Pass `queue` (+ `routingKey`) to also enable `.consume()`.
 * A single instance can do both if you call `.publish()` and `.consume()`
 * on it — useful in a monolith where one process owns both roles.
 *
 * **Connection lifecycle.** {@link RabbitMQ.bootstrap} opens ONE shared
 * connection for the whole process. Call it once on server boot.
 *
 * **Per-queue instances.** `new RabbitMQ(config)` is created lazily,
 * wherever a particular exchange/queue is actually needed. Each instance
 * opens its own channel on top of the shared connection. Channel setup is
 * asynchronous and kicked off in the constructor; `publish`/`consume` await
 * it internally, so callers can use an instance immediately after
 * construction without a manual `init()` step.
 *
 * @example
 * await RabbitMQ.bootstrap();
 *
 * // Publisher-only — no queue, just asserts the exchange
 * const events = new RabbitMQ({ name: "chat.messages", exchangeType: "topic", publishConfirm: "single" });
 * await events.publish({ id: 1 }, {}, undefined, "dm.42.message");
 *
 * // Consumer (or publisher+consumer) — queue required
 * const worker = new RabbitMQ({ name: "tasks", queue: "task.created", routingKey: "task.created" });
 * await worker.consume(async (payload) => { ... });
 *
 * @class RabbitMQ
 */
export class RabbitMQ<T> {
	private static connection: ChannelModel | null = null;
	private channel: Channel | null = null;
	private confirmChannel: ConfirmChannel | null = null;
	private readonly config: ResolvedConfig<T>;
	/** Resolves once this instance's channel + topology are ready. */
	private readonly ready: Promise<void>;

	/**
	 * @param {QueueSetupConfig} rawConfig - Exchange/queue/routing plus optional
	 * DLQ, retry, durability, prefetch and publish-confirm settings.
	 */
	constructor(rawConfig: QueueSetupConfig<T>) {
		this.config = RabbitMQ.resolveConfig(rawConfig);
		this.ready = this.init();
	}

	/**
	 * Applies the `name` shorthand: fills in `exchange` (and `routingKey`, when
	 * a `queue` is set) from `name` if they weren't given explicitly. Validates
	 * that a queue-mode instance always ends up with a routingKey.
	 * @param {QueueSetupConfig} raw - The config passed to the constructor.
	 * @returns {ResolvedConfig} - Config with `exchange` guaranteed to be set.
	 * @throws {Error} - If neither `exchange` nor `name` is provided, or if
	 * `queue` is set without a resolvable `routingKey`.
	 */
	private static resolveConfig<U>(
		raw: QueueSetupConfig<U>
	): ResolvedConfig<U> {
		const exchange = raw.exchange ?? raw.name;
		if (!exchange) {
			throwError(
				"RabbitMQ: either `exchange` or `name` must be provided.",
				StatusCodes.BAD_REQUEST
			);
		}

		const routingKey = raw.queue
			? (raw.routingKey ?? raw.name)
			: raw.routingKey;
		if (raw.queue && !routingKey) {
			throwError(
				"RabbitMQ: `routingKey` (or `name` as a fallback) is required when `queue` is set.",
				StatusCodes.BAD_REQUEST
			);
		}

		return { ...raw, exchange, routingKey };
	}

	static async bootstrap(
		maxRetries: number = 5,
		delay: number = 1000
	): Promise<void> {
		if (RabbitMQ.connection) return;

		try {
			const connection = await amqp.connect({
				hostname: config.env.RABBITMQ_HOST,
				port: config.env.RABBITMQ_PORT,
				username: config.env.RABBITMQ_DEFAULT_USER,
				password: config.env.RABBITMQ_DEFAULT_PASS
			});
			logger.info(
				`✅ [RabbitMQ] connected to ${config.env.RABBITMQ_HOST}:${config.env.RABBITMQ_PORT}`
			);
			connection.on("error", (err) => {
				logger.error("[RabbitMQ] connection error:", err.message);
			});
			connection.on("close", () => {
				logger.warn("[RabbitMQ] connection closed");
				RabbitMQ.connection = null;
			});

			RabbitMQ.connection = connection;
		} catch (error) {
			if (maxRetries === 0) {
				logger.error(
					"[RabbitMQ] connection failed, giving up (broker unreachable):",
					error
				);
				return;
			}
			logger.warn(
				`[RabbitMQ] connect failed, retrying in ${delay}ms (${maxRetries} attempt(s) left)`
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
			await RabbitMQ.bootstrap(maxRetries - 1, delay * 2);
		}
	}

	private static getConnection(): ChannelModel {
		if (!RabbitMQ.connection) {
			throwError(
				"RabbitMQ: no active connection. Call RabbitMQ.bootstrap() on server boot first.",
				StatusCodes.NOT_IMPLEMENTED
			);
		}
		return RabbitMQ.connection;
	}

	static async shutdown(): Promise<void> {
		await RabbitMQ.connection?.close();
		RabbitMQ.connection = null;
	}

	private async init(): Promise<void> {
		const connection = RabbitMQ.getConnection();
		if (this.config.publishConfirm) {
			this.confirmChannel = await connection.createConfirmChannel();
		} else {
			this.channel = await connection.createChannel();
		}
		await this.setupTopology();
	}

	private usesConfirm(): boolean {
		return !!this.config.publishConfirm;
	}

	private activeChannel(): Channel {
		const ch = this.confirmChannel ?? this.channel;
		if (!ch) {
			throwError(
				"RabbitMQ: init() has not completed for this instance.",
				StatusCodes.NOT_IMPLEMENTED
			);
		}
		return ch;
	}

	private getChannel(): Channel {
		if (!this.channel) {
			throwError(
				"RabbitMQ: init() has not been called for this instance.",
				StatusCodes.NOT_IMPLEMENTED
			);
		}
		return this.channel;
	}

	private getConfirmChannel(): ConfirmChannel {
		if (!this.confirmChannel) {
			throwError(
				"RabbitMQ: init() has not been called with publishConfirm enabled.",
				StatusCodes.NOT_IMPLEMENTED
			);
		}
		return this.confirmChannel;
	}

	/**
	 * Asserts the exchange always. If `queue` is configured, also sets up the
	 * DLQ/retry topology, asserts + binds the queue, and applies `prefetch`.
	 * Publisher-only instances (no `queue`) stop after the exchange assertion.
	 * Idempotent: safe to run every time `init()` runs.
	 * @returns {Promise<void>} - Resolves when topology setup is complete.
	 */
	private async setupTopology(): Promise<void> {
		const ch = this.activeChannel();
		const { exchange, exchangeType = "topic", durable = true } = this.config;

		await ch.assertExchange(exchange, exchangeType, { durable });

		if (!this.config.queue) return; // publisher-only — nothing else to set up

		const {
			queue,
			routingKey,
			dlq = true,
			retry,
			prefetchCount = 1
		} = this.config;

		// routingKey is guaranteed by resolveConfig() whenever queue is set
		const rk = routingKey as string;

		const queueArgs: Record<string, unknown> = {};

		// --- Dead Letter Queue: catches anything permanently rejected ---
		if (dlq) {
			const dlxName = `${exchange}.dlx`;
			const dlqName = `${queue}.dlq`;
			await ch.assertExchange(dlxName, "direct", { durable });
			await ch.assertQueue(dlqName, { durable });
			await ch.bindQueue(dlqName, dlxName, rk);

			queueArgs["x-dead-letter-exchange"] = dlxName;
			queueArgs["x-dead-letter-routing-key"] = rk;
		}

		// --- Retry: a parking queue with TTL that dead-letters back to main exchange ---
		if (retry?.enabled) {
			const retryExchange = `${exchange}.retry`;
			const retryQueue = `${queue}.retry`;

			await ch.assertExchange(retryExchange, "direct", { durable });
			await ch.assertQueue(retryQueue, {
				durable,
				arguments: {
					"x-dead-letter-exchange": exchange,
					"x-dead-letter-routing-key": rk,
					"x-message-ttl": retry.retryDelayMs ?? 5000
				}
			});
			await ch.bindQueue(retryQueue, retryExchange, rk);
		}

		await ch.assertQueue(queue, { durable, arguments: queueArgs });
		await ch.bindQueue(queue, exchange, rk);

		// FIX: prefetchCount was previously declared but never applied
		await ch.prefetch(prefetchCount);
	}

	private publishSingle(
		channel: ConfirmChannel,
		content: Buffer,
		options: amqp.Options.Publish | undefined,
		routingKey: string
	): Promise<void> {
		return new Promise((resolve, reject) => {
			channel.publish(
				this.config.exchange,
				routingKey,
				content,
				options,
				(err) => (err ? reject(err) : resolve())
			);
		});
	}

	private publishBatch(
		channel: ConfirmChannel,
		content: Buffer,
		options: amqp.Options.Publish | undefined,
		routingKey: string
	): Promise<void> {
		channel.publish(this.config.exchange, routingKey, content, options);
		return channel.waitForConfirms();
	}

	/**
	 * Consumes from this instance's configured queue. Throws if this instance
	 * was constructed without a `queue` (publisher-only mode).
	 */
	private async consume(): Promise<void> {
		await this.ready;

		if (!this.config.queue) {
			throwError(
				"RabbitMQ: this instance was created without a `queue` (publisher-only mode) — cannot call consume().",
				StatusCodes.BAD_REQUEST
			);
		}

		const ch = this.activeChannel();
		const { queue, exchange, routingKey, retry } = this.config;
		const rk = routingKey as string;
		const maxRetries = retry?.maxRetries ?? 3;
		const retryExchange = `${exchange}.retry`;

		await ch.consume(queue as string, async (msg) => {
			if (!msg) return;

			try {
				const payload = JSON.parse(msg.content.toString());
				await this.config.onConsume?.(payload, msg);
				ch.ack(msg);
			} catch (err) {
				const attempt =
					Number(msg.properties.headers?.["x-retry-count"] ?? 0) + 1;
				logger.error(
					`[RabbitMQ] handler failed for "${queue}" (attempt ${attempt}):`,
					err
				);

				if (retry?.enabled && attempt <= maxRetries) {
					ch.publish(retryExchange, rk, msg.content, {
						persistent: true,
						headers: {
							...msg.properties.headers,
							"x-retry-count": attempt
						}
					});
					ch.ack(msg);
				} else {
					ch.nack(msg, false, false);
				}
			}
		});
	}

	/**
	 * @param routingKeyOverride - Optional dynamic routing key (e.g. `dm.42.message`).
	 * Falls back to `config.routingKey` if omitted — needed for topic exchanges
	 * where the key depends on the specific conversation/room being published to.
	 * Publisher-only instances (no `queue`/`routingKey` configured) should
	 * always pass this explicitly.
	 */
	async publish(
		message: T,
		options: amqp.Options.Publish = {},
		routingKeyOverride?: string
	): Promise<void> {
		await this.ready;
		const content = Buffer.from(JSON.stringify(message));
		const routingKey = routingKeyOverride ?? this.config.routingKey;

		if (!routingKey) {
			throwError(
				"RabbitMQ: no routingKey configured and none passed to publish() — required for this instance.",
				StatusCodes.BAD_REQUEST
			);
		}

		if (this.usesConfirm()) {
			const channel = this.getConfirmChannel();
			if (this.config.publishConfirm === "batch") {
				return this.publishBatch(channel, content, options, routingKey);
			}
			return this.publishSingle(channel, content, options, routingKey);
		}

		const channel = this.getChannel();
		const ok = channel.publish(
			this.config.exchange,
			routingKey,
			content,
			options
		);

		if (!ok) {
			throwError(
				"RabbitMQ: message not published",
				StatusCodes.INTERNAL_SERVER_ERROR
			);
		}

		this.config.onPublish?.(message);
	}

	async close(): Promise<void> {
		await this.channel?.close();
		await this.confirmChannel?.close();
	}

	async start(): Promise<void> {
		if (this.config.onConsume) {
			await this.consume();
		}
	}
}

export default RabbitMQ;
