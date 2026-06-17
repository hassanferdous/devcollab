import redisClient from "@/config/redis";
import { ProjectServices } from "@/domains/v1/project/service";
import { User } from "@/domains/v1/user/service";
import { CookieUtil } from "@/utils/cookie";
import { throwError } from "@/utils/error";
import JWT from "@/utils/jwt";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { ExtendedError, Socket } from "socket.io";

export const socketAuthMiddleware = async (
	socket: Socket,
	next: (err?: ExtendedError) => void
) => {
	const cookies = CookieUtil.parseCookieString(
		socket.handshake.headers.cookie
	);
	const token = cookies.access_token || socket.handshake.auth.token;

	const projectId = +socket.handshake.query.projectId!;

	if (!projectId)
		throwError("Project ID is required", StatusCodes.BAD_REQUEST);

	try {
		if (!token) {
			throwError("Invalid Token", StatusCodes.UNAUTHORIZED);
		}
		const decoded = JWT.verifyToken(token, "access") as User & JwtPayload;
		/**
		 * Check if the refresh token exists in Redis and that the token is not expired
		 */
		const isExists = await redisClient.get(`refresh_token:${decoded.id}`);

		/**
		 * If the refresh token does not exist in Redis, throw an error
		 */
		if (!isExists) throwError("Invalid Token", StatusCodes.UNAUTHORIZED);

		/**
		 * Check if the user is a member of the project
		 */
		const hasMembership = await ProjectServices.isMembership({
			projectId: projectId,
			userId: decoded.id
		});

		if (!hasMembership)
			throwError(
				"You are not authorized to access this project",
				StatusCodes.FORBIDDEN
			);

		socket.data.userId = decoded.id;
		socket.data.user = {
			id: decoded.id,
			email: decoded.email,
			name: decoded.name,
			avatar: decoded.avatar
		};
		if (socket.handshake.query.projectId) {
			socket.data.projectId = +socket.handshake.query.projectId;
		}

		next();
	} catch (error: unknown) {
		return next(new Error((error as { message: string }).message));
	}
};
