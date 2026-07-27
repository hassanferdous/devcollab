import amqplib from "amqplib";
import config from ".";
import logger from "@/lib/logger";
import { throwError } from "@/utils/error";
import { StatusCodes } from "http-status-codes";

/**
 * RabbitMQService — manages a single RabbitMQ connection + channel (created
 * lazily and reused). Both `connection` and `channel` reset to `null` on their
 * `close`/`error` events, so the next `getChannel()` call reconnects transparently.
 *
 * All failures throw an `AppError` of type `RABBITMQ_ERROR` (via `throwError`),
 * which the global error handler maps to a response — so callers invoked outside
 * the request lifecycle must wrap calls in their own try/catch.
 *
 * @class RabbitMQService
 * @property {amqplib.ChannelModel | null} connection - Active connection, or null when disconnected
 * @property {amqplib.Channel | null} channel - Active channel, or null when none is open
 * @method connect - Establish the connection (throws RABBITMQ_ERROR on failure)
 * @method getChannel - Return the cached channel, creating (and connecting) if needed
 * @method publishToQueue - Assert exchange + queue, bind, then publish a message
 * @method close - Close channel + connection and reset state
 */

type ExchangeType =
	| "direct"
	| "fanout"
	| "topic"
	| "headers"
	| "match"
	| string;

type PublishQueueOptions = {
	exchangeOptions: amqplib.Options.AssertExchange;
	queueOptions: amqplib.Options.AssertQueue;
	routingKey?: string;
	exchangeType?: ExchangeType;
};

// All optional fields resolved to defaults — no non-null assertions needed downstream.
type ResolvedPublishQueueOptions = Required<PublishQueueOptions>;

const DEFAULT_EXCHANGE_OPTIONS: amqplib.Options.AssertExchange = {
	durable: true
};

const DEFAULT_QUEUE_OPTIONS: amqplib.Options.AssertQueue = {
	durable: true
};

const DEFAULT_ROUTING_KEY: string = "#";
const DEFAULT_EXCHANGE_TYPE: string = "topic";

export class RabbitMQService {
	private static connection: amqplib.ChannelModel | null;
	private static channel: amqplib.Channel | null;

	constructor() {
		RabbitMQService.connection = null;
		RabbitMQService.channel = null;
	}

	static async connect() {
		try {
			this.connection = await amqplib.connect({
				hostname: config.env.RABBITMQ_HOST,
				port: config.env.RABBITMQ_PORT,
				username: config.env.RABBITMQ_DEFAULT_USER,
				password: config.env.RABBITMQ_DEFAULT_PASS
			});
			this.connection.on("close", () => {
				this.connection = null;
				this.channel = null;
			});
			this.connection.on("error", (err) =>
				logger.error("RabbitMQ connection error:", err)
			);
			logger.info("✅ RabbitMQ connected");
		} catch (err) {
			logger.error("❌ RabbitMQ connect failed:", err);
			throwError(
				"Failed to connect to RabbitMQ",
				StatusCodes.SERVICE_UNAVAILABLE,
				"RABBITMQ_ERROR"
			);
		}
	}

	static async getChannel() {
		if (this.channel) return this.channel;
		if (!this.connection) await this.connect();
		if (!this.connection) {
			throwError(
				"RabbitMQ connection is not available",
				StatusCodes.SERVICE_UNAVAILABLE,
				"RABBITMQ_ERROR"
			);
		}
		this.channel = await this.connection.createChannel();
		this.channel.on("error", (err) => {
			this.channel = null;
			logger.error("RabbitMQ channel error:", err);
		});
		this.channel.on("close", () => {
			this.channel = null;
		});
		return this.channel;
	}

	static async close() {
		try {
			await RabbitMQService.channel?.close();
			await RabbitMQService.connection?.close();
			RabbitMQService.channel = null;
			RabbitMQService.connection = null;
			logger.info("✅ RabbitMQ connection closed");
		} catch (err) {
			logger.error("❌ Error closing RabbitMQ connection:", err);
		}
	}

	/**
	 * Assert the exchange and queue, bind them, then publish a message.
	 * Missing `exchangeType`/`routingKey` default to `topic` / `#`; exchange and
	 * queue both default to `durable: true`. Throws RABBITMQ_ERROR on any failure.
	 *
	 * @param exchangeName - Exchange to assert and publish to
	 * @param queueName - Queue to assert and bind
	 * @param message - Message payload (sent as a UTF-8 Buffer)
	 * @param options - Exchange/queue options, routing key, and exchange type
	 */
	static async publishToQueue(
		exchangeName: string,
		queueName: string,
		message: string,
		options: PublishQueueOptions
	) {
		const $options: ResolvedPublishQueueOptions = {
			exchangeOptions: {
				...DEFAULT_EXCHANGE_OPTIONS,
				...options.exchangeOptions
			},
			queueOptions: {
				...DEFAULT_QUEUE_OPTIONS,
				...options.queueOptions
			},
			exchangeType: options.exchangeType ?? DEFAULT_EXCHANGE_TYPE,
			routingKey: options.routingKey ?? DEFAULT_ROUTING_KEY
		};

		try {
			const channel = await RabbitMQService.getChannel();

			// Setup exchange
			const exchange = exchangeName;
			await channel.assertExchange(
				exchange,
				$options.exchangeType,
				$options.exchangeOptions
			);
			// Setup queue
			const queue = queueName;
			await channel.assertQueue(queue, $options.queueOptions);
			// Bind queue to exchange
			await channel.bindQueue(queue, exchange, $options.routingKey);
			// Publish message
			const ok = channel.publish(
				exchange,
				$options.routingKey,
				Buffer.from(message)
			);

			if (!ok) {
				logger.warn("⚠️  RabbitMQ channel is full");
			}
		} catch (err) {
			logger.error("❌ RabbitMQ publish failed:", err);
			throwError(
				"Failed to publish to RabbitMQ",
				StatusCodes.INTERNAL_SERVER_ERROR,
				"RABBITMQ_ERROR"
			);
		}
	}
}
