import redisClient from "@/config/redis";
import { ApiResponse } from "@/utils/response";
import { Request, Response } from "express";
import { MINUTE, rateLimit } from "express-rate-limit";
import { StatusCodes } from "http-status-codes";
import { RedisStore, type RedisReply } from "rate-limit-redis";

type RateLimitOptions = Parameters<typeof rateLimit>[0];

/**
 * Creates a Redis store for rate limiting
 * @param {string} prefix - Redis key prefix
 * @returns {RedisStore} Redis store instance
 */
const createStore = (prefix: string) =>
	new RedisStore({
		prefix,
		sendCommand: (command: string, ...args: string[]) =>
			redisClient.call(command, ...args) as Promise<RedisReply>
	});

/**
 * Common options for rate limiting
 * @param {boolean} standardHeaders - Whether to include standard headers
 * @param {boolean} legacyHeaders - Whether to disable the `X-RateLimit-*` headers
 * @param {Function} handler - Response sent when the limit is exceeded
 */
const commonOptions = {
	standardHeaders: true,
	legacyHeaders: false,
	handler: (_req: Request, res: Response) =>
		ApiResponse.error(
			res,
			"Too many requests, please try again later.",
			StatusCodes.TOO_MANY_REQUESTS,
			"RATE_LIMIT_EXCEEDED"
		)
};

const createLimiter = ({
	prefix,
	windowMs = 15 * MINUTE,
	...options
}: RateLimitOptions & { prefix: string }) =>
	rateLimit({
		store: createStore(prefix),
		windowMs,
		...commonOptions,
		...options
	});

/**
 * Authentication rate limiter - Limits authentication requests to 5 per 15 minutes
 */
export const loginLimiter = createLimiter({
	max: 5,
	prefix: "rl:login:",
	skipSuccessfulRequests: true
});

/**
 * Register rate limiter - Limits register requests to 5 per 15 minutes
 */
export const registerLimiter = createLimiter({
	max: 5,
	prefix: "rl:register:"
});

/**
 * Refresh token rate limiter - Limits refresh token requests to 20 per 15 minutes
 */
export const refreshTokenLimiter = createLimiter({
	max: 20,
	prefix: "rl:refresh:"
});

/**
 * OTP rate limiter - Limits OTP verification requests to 5 per 10 minutes
 */
export const otpLimiter = createLimiter({
	max: 5,
	prefix: "rl:otp:",
	windowMs: 10 * MINUTE
});

/**
 * Forgot password - Limits forgot password requests to 5 per 15 minutes
 */
export const forgotPasswordLimiter = createLimiter({
	max: 5,
	prefix: "rl:forgot-password:",
	windowMs: 15 * MINUTE,
	skipSuccessfulRequests: true
});

/**
 * Reset password - Limits reset password requests to 5 per 15 minutes
 */
export const resetPasswordLimiter = createLimiter({
	max: 5,
	prefix: "rl:reset-password:",
	windowMs: 15 * MINUTE
});

/**
 * API rate limiter - Limits API requests to 100 per 1 minute
 */
export const apiLimiter = createLimiter({
	max: 100,
	prefix: "rl:api:",
	windowMs: 1 * MINUTE,
	skip: (req) => req.url === "/health" || req.url === "/"
});
