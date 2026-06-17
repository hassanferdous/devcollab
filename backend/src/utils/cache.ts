import redisClient from "@/config/redis";
import logger from "@/lib/logger";

export const getOrSet = async <T>(
	key: string,
	ttl: number,
	fetchFn: () => Promise<T | undefined | void>
): Promise<T | undefined | void> => {
	const cached = await redisClient.get(key);
	logger.info(`[cache] ${cached ? "HIT" : "MISS"} - ${key}`);
	if (cached) return JSON.parse(cached);
	const data = await fetchFn();
	if (data) await redisClient.setex(key, ttl, JSON.stringify(data));
	return data;
};
