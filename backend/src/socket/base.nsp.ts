import redisClient from "@/config/redis";
import { User } from "@/domains/v1/user/service";
import { throwError } from "@/utils/error";
import JWT from "@/utils/jwt";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { ExtendedError, Namespace, Server, Socket } from "socket.io";

export abstract class BaseNamespace {
	protected nsp: Namespace;
	constructor(io: Server, namespace: string) {
		this.nsp = io.of(namespace);
		this.applyMiddleware();
		this.listen();
	}
	private applyMiddleware() {
		this.nsp.use(
			async (socket: Socket, next: (err?: ExtendedError) => void) => {
				const token = socket.handshake.auth.token;
				try {
					const decoded = JWT.verifyToken(token, "access") as User &
						JwtPayload;
					/**
					 * @description Check if the refresh token exists in Redis and that the token is not expired
					 */
					const isExists = await redisClient.get(
						`refresh_token:${decoded.id}`
					);

					/**
					 * @description If the refresh token does not exist in Redis, throw an error
					 */
					if (!isExists)
						throwError("Invalid Token", StatusCodes.UNAUTHORIZED);

					socket.data.userId = decoded.id;
					if (socket.handshake.query.projectId) {
						socket.data.projectId = +socket.handshake.query.projectId;
					}

					next();
				} catch (error: unknown) {
					return next(new Error((error as { message: string }).message));
				}
			}
		);
	}
	private listen() {
		this.nsp.on("connection", (socket: Socket) => {
			// eslint-disable-next-line no-console
			console.log(`connected to ${this.nsp.name}`, {
				id: socket.id,
				userId: socket.data.userId,
				projectId: socket.handshake.query.projectId
			});
			this.on_connect(socket);

			/**
			 * @description Handle disconnect event
			 */
			socket.on("disconnect", () => {
				// eslint-disable-next-line no-console
				console.log(`disconnected from ${this.nsp.name}`, {
					id: socket.id,
					userId: socket.data.userId,
					projectId: socket.handshake.query.projectId
				});
				this.on_disconnect(socket);
			});
		});
	}

	/**
	 * @description Get all connected sockets
	 */
	public get(): Namespace {
		return this.nsp;
	}
	protected abstract on_connect(socket: Socket): void;
	protected on_disconnect(_socket: Socket): void {}
}
