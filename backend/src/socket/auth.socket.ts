import redisClient from "@/services/redis";
import { ProjectServices } from "@/domains/v1/project/service";
import { User } from "@/domains/v1/user/service";
import { CookieUtil } from "@/utils/cookie";
import { throwError } from "@/utils/error";
import JWT from "@/utils/jwt";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { ExtendedError, Socket } from "socket.io";

/**
 * Verify a socket handshake's access token against Redis and return the decoded
 * user. Shared by every namespace's auth middleware; carries no project context.
 *
 * @throws if the token is missing, invalid, or the refresh token is gone
 */
export const verifySocketUser = async (
	socket: Socket
): Promise<User & JwtPayload> => {
	const cookies = CookieUtil.parseCookieString(
		socket.handshake.headers.cookie
	);
	const token = cookies.access_token || socket.handshake.auth.token;

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

	return decoded;
};

export const socketAuthMiddleware = async (
	socket: Socket,
	next: (err?: ExtendedError) => void
) => {
	const projectId = +socket.handshake.query.projectId!;

	try {
		if (!projectId)
			throwError("Project ID is required", StatusCodes.BAD_REQUEST);
		const decoded = await verifySocketUser(socket);

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
