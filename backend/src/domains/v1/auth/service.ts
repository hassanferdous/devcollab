import db from "@/config/db";
import { usersTable } from "@/db/user.schema";
import { CookieUtil } from "@/utils/cookie";
import { throwError } from "@/utils/error";
import JWT from "@/utils/jwt";
import { hashPassword } from "@/utils/password-hash";
import { ApiResponse } from "@/utils/response";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import passport from "passport";
import { User } from "../user/service";
import redisClient from "@/services/redis";
import ms, { StringValue } from "ms";
import config from "@/config";

export const AuthServices = {
	/**
	 * @description Credential login callback
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @param {NextFunction} next
	 * @returns {Promise<any>}
	 */
	callback_credential: (req: Request, res: Response, next: NextFunction) => {
		passport.authenticate(
			"local",
			{ session: false },
			async (err: never, user: User, _info: never) => {
				if (err || !user)
					return ApiResponse.error(
						res,
						"Invalid email or password",
						StatusCodes.UNAUTHORIZED,
						"CREDENTIALS"
					);
				const { $access_token, $refresh_token } =
					await AuthServices._generateTokens(user, res);
				const isMobile = req.headers["x-client-type"] === "mobile";
				return ApiResponse.success(
					res,
					"User logged in successfully",
					{
						user,
						tokens: {
							access_token: $access_token,
							...(isMobile ? { refresh_token: $refresh_token } : {})
						}
					},
					StatusCodes.OK
				);
			}
		)(req, res, next);
	},

	/**
	 * @description Google login callback
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @param {NextFunction} next
	 * @returns {Promise<any>}
	 */
	callback_google: async (req: Request, res: Response, next: NextFunction) => {
		passport.authenticate(
			"google",
			{ session: false },
			async (err: never, user: User, _info: never) => {
				if (err || !user) {
					throwError(
						"Something went wrong",
						StatusCodes.INTERNAL_SERVER_ERROR
					);
				}
				/*
				 * Set Access and refresh token
				 */
				await AuthServices._generateTokens(user, res);

				/*
				 * Redirect to frontend
				 */
				if (err) return next(err);
				if (!user) return res.redirect("/login?error=OAuthFailed");
				return res.redirect("/");
			}
		)(req, res, next);
	},

	/**
	 * @description Register new user
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise<any>}
	 */
	register: async (req: Request, res: Response) => {
		const hash = await hashPassword(req.body.password);
		const result = await db
			.insert(usersTable)
			.values({ ...req.body, password_hash: hash })
			.returning({
				id: usersTable.id,
				email: usersTable.email,
				name: usersTable.name,
				avatar: usersTable.avatar
			});
		return ApiResponse.success(
			res,
			"User registered successfully",
			result,
			StatusCodes.CREATED
		);
	},

	/**
	 * @description Refresh tokens
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise<any>}
	 */
	refreshTokens: async (req: Request, res: Response) => {
		const cookieToken = CookieUtil.getCookie(req, "refresh_token");
		const headerToken = req.headers["x-refresh-token"] as string | undefined;
		const $token = cookieToken || headerToken;
		if (!$token)
			return ApiResponse.error(
				res,
				"Refresh token not found",
				StatusCodes.BAD_REQUEST,
				"REFRESH_TOKEN_NOT_FOUND"
			);

		const user = JWT.verifyToken($token, "refresh") as User;
		if (!user)
			return throwError(
				"Invalid Or Expired refresh token",
				StatusCodes.UNAUTHORIZED,
				"REFRESH_TOKEN_INVALID"
			);

		/**
		 * @description Check if the refresh token exists and matches the one in Redis
		 */
		const storedToken = await redisClient.get(`refresh_token:${user.id}`);
		if (storedToken !== $token || !storedToken) {
			return throwError(
				"Invalid refresh token",
				StatusCodes.UNAUTHORIZED,
				"REFRESH_TOKEN_INVALID"
			);
		}
		/**
		 * @description Generate new access and refresh token
		 *
		 * @param {User} user
		 * @param {Response} res
		 * @returns {Object}
		 */
		const { $access_token, $refresh_token } =
			await AuthServices._generateTokens(
				{
					id: user.id,
					email: user.email,
					name: user.name,
					avatar: user.avatar,
					provider: user.provider,
					password_hash: ""
				} as User,
				res
			);
		/**
		 * @description Respond in the same channel the request came through.
		 * Cookie present => web (refresh token stays out of the body); token
		 * supplied via the x-refresh-token header => mobile (return it in body).
		 */
		const fromCookie = !!cookieToken;
		return ApiResponse.success(
			res,
			"Refresh token generated successfully",
			{
				user,
				tokens: {
					access_token: $access_token,
					...(fromCookie ? {} : { refresh_token: $refresh_token })
				}
			},
			StatusCodes.OK
		);
	},

	/**
	 * @description Reset Password request
	 *
	 * @param {Request} _req
	 * @param {Response} _res
	 * @returns {Promise<any>}
	 */
	resetPasswordRequest: async (_req: Request, _res: Response) => {
		// Todo: Implement forgot password
	},

	/**
	 * @description Verify OTP
	 *
	 * @param {Request} _req
	 * @param {Response} _res
	 * @returns {Promise<any>}
	 */
	verifyOTPHandler: async (_req: Request, _res: Response) => {
		// Todo: Implement verify OTP
	},

	/**
	 * @description Reset password
	 *
	 * @param {Request} _req
	 * @param {Response} _res
	 * @returns {Promise<any>}
	 */
	resetPassword: async (_req: Request, _res: Response) => {
		// Todo: Implement reset password
	},

	/**
	 * @description Logout
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise<any>}
	 */
	logout: async (req: Request, res: Response) => {
		await redisClient.del(`refresh_token:${req.user?.id}`);
		CookieUtil.clearCookie(res, "refresh_token");
		CookieUtil.clearCookie(res, "access_token");
		return ApiResponse.success(
			res,
			"User logged out successfully",
			null,
			StatusCodes.OK
		);
	},

	/**
	 * @description Get authenticated user
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise<any>}
	 */
	getMe: async (req: Request, res: Response) => {
		return ApiResponse.success(
			res,
			"User details retrieved successfully",
			req.user,
			StatusCodes.OK
		);
	},

	/**
	 * @description Generate Token and set cookie
	 *
	 * @param {User} user
	 * @param {Response} res
	 * @returns {Promise<{ $access_token: string; $refresh_token: string }>}
	 */
	_generateTokens: async (user: User, res: Response) => {
		const $access_token = JWT.generateToken(user, "access");
		const $refresh_token = JWT.generateToken(user, "refresh");
		CookieUtil.setCookie(res, "access_token", $access_token, {
			httpOnly: true,
			secure: config.isProduction,
			sameSite: "strict",
			maxAge: ms(config.env.JWT_ACCESS_EXPIRES_IN! as StringValue) // 15 minutes
		});
		CookieUtil.setCookie(res, "refresh_token", $refresh_token, {
			httpOnly: true,
			secure: config.isProduction,
			sameSite: "strict",
			maxAge: ms(config.env.JWT_REFRESH_EXPIRES_IN! as StringValue) // 7 days
		});

		await redisClient.set(
			`refresh_token:${user.id}`,
			$refresh_token,
			"EX",
			ms(config.env.JWT_REFRESH_EXPIRES_IN! as StringValue) // 7 days
		);

		return { $access_token, $refresh_token };
	}
};
