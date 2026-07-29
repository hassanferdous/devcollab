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

export interface QueueSetupConfig {
	exchange: string;
	exchangeType?: ExchangeType;
	queue: string;
	routingKey: string;
	dlq?: boolean; // default true
	retry?: RetryConfig; // default disabled
	durable?: boolean; // default true
	prefetchCount?: number; // default 1
	publishConfirm?: "batch" | "single" | boolean; // default false
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
 * - asserting a queue and binding it with a routing key,
 * - wiring a dead-letter exchange/queue so failed messages are never lost,
 * - (optional) a delayed retry mechanism using a TTL "parking" queue that
 *   dead-letters back into the main exchange once the delay expires.
 *
 * **Connection lifecycle.** {@link RabbitMQ.bootstrap} opens ONE shared
 * connection for the whole process, using the discrete `RABBITMQ_HOST` /
 * `RABBITMQ_PORT` / `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` values
 * from validated config. Call it once on server boot.
 *
 * **Per-queue instances.** `new RabbitMQ(config)` is created lazily,
 * wherever a particular queue is actually needed. Each instance opens its own
 * channel on top of the shared connection and sets up its own
 * exchange/queue/DLQ/retry topology. Channel setup is asynchronous and kicked
 * off in the constructor; `publish`/`consume` await it internally, so callers
 * can use an instance immediately after construction without a manual
 * `init()` step.
 *
 * @example
 * await RabbitMQ.bootstrap();
 * const mq = new RabbitMQ({ exchange: "tasks", queue: "task.created", routingKey: "task.created" });
 * await mq.publish({ id: 1 });
 *
 * @class RabbitMQ
 */

export class RabbitMQ {
	private static connection: ChannelModel | null = null;
	private channel: Channel | null = null;
	private confirmChannel: ConfirmChannel | null = null;
	/** Resolves once this instance's channel + topology are ready. */
	private readonly ready: Promise<void>;

	/**
	 * @param {QueueSetupConfig} config - Exchange/queue/routing plus optional
	 * DLQ, retry, durability, prefetch and publish-confirm settings.
	 */
	constructor(private readonly config: QueueSetupConfig) {
		this.ready = this.init();
	}

	/**
	 * Opens the single shared connection for the whole app, using the validated
	 * `config.env.RABBITMQ_HOST` / `RABBITMQ_PORT` / `RABBITMQ_DEFAULT_USER` /
	 * `RABBITMQ_DEFAULT_PASS` values. Idempotent — a no-op if a connection is
	 * already open. Call once on server boot, before any RabbitMQ instance is
	 * used. On connection `close` the shared reference is reset so a later
	 * `bootstrap()` reconnects.
	 *
	 * Retries with exponential backoff (mirrors `connectDB` in `server.ts`) so a
	 * first boot that races the broker's ~10–30s startup — the classic
	 * `ECONNREFUSED ...:5672` — recovers instead of giving up after one attempt.
	 * RabbitMQ is treated as a non-fatal dependency: once retries are exhausted
	 * it logs and returns (the process keeps running) rather than exiting.
	 * @param {number} [maxRetries=5] - Remaining connection attempts before giving up.
	 * @param {number} [delay=1000] - Backoff before the next retry, in ms (doubles each attempt).
	 * @returns {Promise<void>} - Resolves once connected, or once retries are exhausted.
	 */
	static async bootstrap(
		maxRetries: number = 5,
		delay: number = 1000
	): Promise<void> {
		if (RabbitMQ.connection) return; // already connected

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

	/**
	 * Gets the shared connection.
	 * @returns {ChannelModel} - The shared connection.
	 * @throws {Error} - Throws an error if the connection is not opened.
	 */
	private static getConnection(): ChannelModel {
		if (!RabbitMQ.connection) {
			throwError(
				"RabbitMQ: no active connection. Call RabbitMQ.bootstrap() on server boot first.",
				StatusCodes.NOT_IMPLEMENTED
			);
		}
		return RabbitMQ.connection;
	}

	/**
	 * Closes the shared connection app-wide (e.g. on graceful shutdown).
	 * @returns {Promise<void>} - The promise that resolves when the connection is closed.
	 */
	static async shutdown(): Promise<void> {
		await RabbitMQ.connection?.close();
		RabbitMQ.connection = null;
	}

	/**
	 * Opens this instance's channel (confirm channel when `publishConfirm` is
	 * set, otherwise a plain channel) and sets up its exchange/queue/DLQ/retry
	 * topology. Kicked off by the constructor and exposed via `this.ready`;
	 * `publish`/`consume` await it, so callers never invoke this directly.
	 * @returns {Promise<void>} - The promise that resolves when the channel is ready.
	 * @throws {Error} - Throws an error if the shared connection is not opened.
	 */
	private async init(): Promise<void> {
		const connection = RabbitMQ.getConnection();
		if (this.config.publishConfirm) {
			this.confirmChannel = await connection.createConfirmChannel();
		} else {
			this.channel = await connection.createChannel();
		}
		await this.setupQueue();
	}

	/** @returns {boolean} `true` when this instance was configured to use publish confirms. */
	private usesConfirm(): boolean {
		return !!this.config.publishConfirm;
	}

	/**
	 * Returns whichever channel this instance actually opened — the confirm
	 * channel when `publishConfirm` is set, otherwise the plain channel. Since
	 * amqplib's `ConfirmChannel extends Channel`, the returned value is safe for
	 * all channel operations (assert/bind/consume/publish/ack/nack).
	 * @returns {Channel} - The active channel for this instance.
	 * @throws {Error} - If neither channel has been opened yet (init incomplete).
	 */
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

	/**
	 * Returns the plain (non-confirm) channel. Only valid when `publishConfirm`
	 * is not set.
	 * @returns {Channel} - The plain channel.
	 * @throws {Error} - If the plain channel has not been opened.
	 */
	private getChannel(): Channel {
		if (!this.channel) {
			throwError(
				"RabbitMQ: init() has not been called for this instance.",
				StatusCodes.NOT_IMPLEMENTED
			);
		}
		return this.channel;
	}

	/**
	 * Returns the confirm channel. Only valid when `publishConfirm` is set.
	 * @returns {ConfirmChannel} - The confirm channel.
	 * @throws {Error} - If the confirm channel has not been opened.
	 */
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
	 * Asserts the exchange, the main queue, and (when enabled) the dead-letter
	 * and delayed-retry topology, then binds the main queue to the exchange.
	 * Runs on whichever channel this instance opened (plain or confirm).
	 * Idempotent: safe to run every time `init()` runs.
	 * @returns {Promise<void>} - The promise that resolves when the queue is set up.
	 * @throws {Error} - Throws an error if the channel is not opened.
	 */
	private async setupQueue(): Promise<void> {
		const ch = this.activeChannel();
		const {
			exchange,
			exchangeType = "topic",
			queue,
			routingKey,
			dlq = true,
			retry,
			durable = true
		} = this.config;

		await ch.assertExchange(exchange, exchangeType, { durable });

		const queueArgs: Record<string, unknown> = {};

		// --- Dead Letter Queue: catches anything permanently rejected ---
		if (dlq) {
			const dlxName = `${exchange}.dlx`;
			const dlqName = `${queue}.dlq`;
			await ch.assertExchange(dlxName, "direct", { durable });
			await ch.assertQueue(dlqName, { durable });
			await ch.bindQueue(dlqName, dlxName, routingKey);

			queueArgs["x-dead-letter-exchange"] = dlxName;
			queueArgs["x-dead-letter-routing-key"] = routingKey;
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
					"x-dead-letter-routing-key": routingKey,
					"x-message-ttl": retry.retryDelayMs ?? 5000
				}
			});
			await ch.bindQueue(retryQueue, retryExchange, routingKey);
		}

		await ch.assertQueue(queue, { durable, arguments: queueArgs });
		await ch.bindQueue(queue, exchange, routingKey);
	}

	/**
	 * Publishes a message to this instance's configured exchange/routingKey.
	 * The payload is JSON-serialized. Awaits channel setup internally, so it is
	 * safe to call immediately after construction. Routing depends on config:
	 * `publishConfirm: "batch"` → batched confirms, `"single"`/`true` →
	 * per-message confirm, otherwise a plain fire-and-forget publish.
	 * @param {unknown} message - The payload to publish (JSON-serialized).
	 * @param {amqp.Options.Publish} [options] - amqplib publish options.
	 * @param {PublishCallback} [onResult] - Optional side-effect hook (metrics,
	 * logging, etc). Only invoked on the plain, non-confirm path.
	 * @returns {Promise<void>} - Resolves once the message is handed off (or confirmed).
	 * @throws {Error} - If the broker's write buffer rejects the message (non-confirm path).
	 */
	async publish(
		message: unknown,
		options: amqp.Options.Publish = {},
		onResult?: PublishCallback
	): Promise<void> {
		await this.ready;
		const content = Buffer.from(JSON.stringify(message));

		if (this.usesConfirm()) {
			const channel = this.getConfirmChannel();
			if (this.config.publishConfirm === "batch") {
				return this.publishBatch(channel, content, options);
			}
			return this.publishSingle(channel, content, options);
		}

		// plain Channel path — fire and forget
		const channel = this.getChannel();
		const ok = channel.publish(
			this.config.exchange,
			this.config.routingKey,
			content,
			options
		);

		if (!ok) {
			onResult?.(new Error("RabbitMQ: message not published"), {
				exchange: this.config.exchange,
				routingKey: this.config.routingKey
			});
			throwError(
				"RabbitMQ: message not published",
				StatusCodes.INTERNAL_SERVER_ERROR
			);
		}

		onResult?.(null, {
			exchange: this.config.exchange,
			routingKey: this.config.routingKey
		});
	}

	/**
	 * Publishes a single message and resolves only once the broker confirms it
	 * (or rejects on nack). Used for the `"single"` / `true` confirm mode.
	 * @param {ConfirmChannel} channel - The confirm channel to publish on.
	 * @param {Buffer} content - The serialized message body.
	 * @param {amqp.Options.Publish} [options] - amqplib publish options.
	 * @returns {Promise<void>} - Resolves when the broker acks the message.
	 * @throws {Error} - Rejects if the broker nacks the message.
	 */
	private publishSingle(
		channel: ConfirmChannel,
		content: Buffer,
		options?: amqp.Options.Publish
	): Promise<void> {
		return new Promise((resolve, reject) => {
			channel.publish(
				this.config.exchange,
				this.config.routingKey,
				content,
				options,
				(err) => (err ? reject(err) : resolve())
			);
		});
	}

	/**
	 * Publishes without a per-message callback and resolves once all currently
	 * outstanding confirms have been acked. Used for the `"batch"` confirm mode.
	 * @param {ConfirmChannel} channel - The confirm channel to publish on.
	 * @param {Buffer} content - The serialized message body.
	 * @param {amqp.Options.Publish} [options] - amqplib publish options.
	 * @returns {Promise<void>} - Resolves when the outstanding batch is confirmed.
	 * @throws {Error} - Rejects if any message in the batch is nacked.
	 */
	private publishBatch(
		channel: ConfirmChannel,
		content: Buffer,
		options?: amqp.Options.Publish
	): Promise<void> {
		// no per-message callback — let messages queue up, then confirm as a batch
		channel.publish(
			this.config.exchange,
			this.config.routingKey,
			content,
			options
		);
		return channel.waitForConfirms();
	}

	/**
	 * Consumes from this instance's configured queue. On handler failure:
	 * - if retry is enabled and under maxRetries -> republish to the retry queue (delayed)
	 * - otherwise -> nack without requeue, which routes it to the DLQ
	 *
	 * `onEvent` is an optional side-effect hook fired on every ack/retry/dlq outcome.
	 * Awaits channel setup internally, so it is safe to call immediately after
	 * construction, and runs on whichever channel this instance opened.
	 * @param {(payload: T, raw: ConsumeMessage) => Promise<void>} handler - Async
	 * message handler; throwing triggers the retry/DLQ path.
	 * @param {ConsumeCallback} [onEvent] - Optional hook fired on every ack/retry/dlq outcome.
	 * @returns {Promise<void>} - The promise that resolves when the consumer is started.
	 * @throws {Error} - Throws an error if the channel is not opened.
	 */
	async consume<T = unknown>(
		handler: (payload: T, raw: ConsumeMessage) => Promise<void>,
		onEvent?: ConsumeCallback
	): Promise<void> {
		await this.ready;
		const ch = this.activeChannel();
		const { queue, exchange, routingKey, retry } = this.config;
		const maxRetries = retry?.maxRetries ?? 3;
		const retryExchange = `${exchange}.retry`;

		await ch.consume(queue, async (msg) => {
			if (!msg) return;

			try {
				const payload = JSON.parse(msg.content.toString()) as T;
				await handler(payload, msg);
				ch.ack(msg);
				onEvent?.({ type: "ack", message: msg });
			} catch (err) {
				const attempt =
					Number(msg.properties.headers?.["x-retry-count"] ?? 0) + 1;
				logger.error(
					`[RabbitMQ] handler failed for "${queue}" (attempt ${attempt}):`,
					err
				);

				if (retry?.enabled && attempt <= maxRetries) {
					ch.publish(retryExchange, routingKey, msg.content, {
						persistent: true,
						headers: {
							...msg.properties.headers,
							"x-retry-count": attempt
						}
					});
					ch.ack(msg); // remove from main queue; it'll come back after the TTL delay
					onEvent?.({ type: "retry", message: msg, attempt, error: err });
				} else {
					ch.nack(msg, false, false); // -> DLQ (if configured), message is never silently lost
					onEvent?.({ type: "dlq", message: msg, attempt, error: err });
				}
			}
		});
	}

	/**
	 * Closes just this instance's channel (whichever was opened — plain or
	 * confirm), leaving the shared connection intact. Use
	 * {@link RabbitMQ.shutdown} to tear down the connection app-wide.
	 * @returns {Promise<void>} - The promise that resolves when the channel is closed.
	 */
	async close(): Promise<void> {
		await this.channel?.close();
		await this.confirmChannel?.close();
	}
}

export default RabbitMQ;
