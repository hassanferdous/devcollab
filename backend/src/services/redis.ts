import Redis from "ioredis";
import { envVar } from "../config/env.schema";
import logger from "@/lib/logger";

const redisClient = new Redis({
	port: envVar.REDIS_PORT,
	host: envVar.REDIS_HOST,
	maxRetriesPerRequest: null,
	enableReadyCheck: false,
	retryStrategy(times) {
		const delay = Math.min(times * 50, 2000);
		return delay;
	}
});

redisClient.on("connect", () => {
	logger.info("✅ Redis socket connected");
});

redisClient.on("ready", () => {
	logger.info("✅ Redis ready for commands");
});

redisClient.on("error", (err) => {
	logger.error("❌ Redis error:", err.message);
});

redisClient.on("reconnect", () => {
	logger.info("✅ Redis socket reconnected");
});

export default redisClient;
