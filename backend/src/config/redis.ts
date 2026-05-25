/* eslint-disable no-console */

import Redis from "ioredis";
import { envVar } from "./env.schema";
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
	console.log("Redis connected on port", envVar.REDIS_PORT);
	logger.info("Redis socket connected");
});

redisClient.on("ready", () => {
	console.log("Redis ready for commands on port", envVar.REDIS_PORT);
	logger.info("✅ Redis ready for commands");
});

redisClient.on("error", (err) => {
	console.log("Redis error on port", envVar.REDIS_PORT);
	logger.error(err.message);
});

export default redisClient;
