import { Namespace, Server, Socket } from "socket.io";
import { BaseNamespace } from "./base.nsp";
import { verifySocketUser } from "./auth.socket";

/**
 * Global, per-user namespace for delivering notifications. Unlike `/project`,
 * it needs no `projectId` — a user connects once after login and joins their
 * private `user:<id>` room, so mentions reach them anywhere in the app.
 */
export class NotificationNamespace extends BaseNamespace {
	constructor(io: Server) {
		super(io, "/notifications");
	}

	protected registerMiddleware(nsp: Namespace): void {
		nsp.use(async (socket, next) => {
			try {
				const user = await verifySocketUser(socket);
				socket.data.userId = user.id;
				socket.data.user = {
					id: user.id,
					email: user.email,
					name: user.name,
					avatar: user.avatar
				};
				next();
			} catch (error: unknown) {
				next(new Error((error as { message: string }).message));
			}
		});
	}

	protected on_connect(socket: Socket) {
		socket.join(`user:${socket.data.userId}`);
	}
}
