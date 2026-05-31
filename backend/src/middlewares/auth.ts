import { throwError } from "@/utils/error";
import JWT from "@/utils/jwt";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import redisClient from "@/config/redis";
import { User } from "@/domains/v1/user/service";

export default async function auth(
	_req: Request,
	_res: Response,
	next: NextFunction
) {
	const req = _req as Request & {
		csrf?: string;
		_isCookies: boolean;
	};
	const cookies = req.cookies;
	const headers = req.headers;
	const access_token =
		cookies.access_token ?? headers.authorization?.replace("Bearer ", "");
	const _isCookies = !!cookies.access_token;

	console.log("*************** from middleware ***************");
	console.log({ cookies });

	if (!access_token) throwError("Invalid Token", StatusCodes.UNAUTHORIZED);

	try {
		const decoded = JWT.verifyToken(access_token, "access") as User &
			JwtPayload;
		/**
		 * @description Check if the refresh token exists in Redis and that the token is not expired
		 */
		const isExists = await redisClient.get(`refresh_token:${decoded.id}`);

		/**
		 * @description If the refresh token does not exist in Redis, throw an error
		 */
		if (!isExists) throwError("Invalid Token", StatusCodes.UNAUTHORIZED);

		req.user = decoded;
		req._isCookies = _isCookies;
		// Accept CSRF token from header or body
		const csrfHeader = headers["x-csrf-token"];
		const csrfBody = req.body?._csrf;

		req.csrf =
			(Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader) || csrfBody;
		next();
	} catch (error) {
		if (error instanceof Error) {
			throwError(error.message || "Invalid Token", StatusCodes.UNAUTHORIZED);
		}
		throwError("Invalid Token", StatusCodes.UNAUTHORIZED);
	}
}
