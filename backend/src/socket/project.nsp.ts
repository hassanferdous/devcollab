import { User } from "@/domains/v1/user/service";
import { Namespace, Server, Socket } from "socket.io";
import { BaseNamespace } from "./base.nsp";
import { socketAuthMiddleware } from "./auth.socket";
import { sendMessageSchema } from "@/domains/v1/chat/validation";
import logger from "@/lib/logger";
import { chatPublisher } from "@/domains/v1/chat/worker";

interface SocketData {
	userId: string;
	user: User;
	projectId: string;
}

export class ProjectNamespace extends BaseNamespace {
	constructor(io: Server) {
		super(io, "/project");
	}

	/**
	 * Register middleware for the namespace
	 * @param nsp - The namespace
	 */
	protected registerMiddleware(nsp: Namespace): void {
		nsp.use(socketAuthMiddleware);
	}

	/**
	 * Handle connect event
	 * @param socket
	 */
	protected on_connect(socket: Socket) {
		// Add user to room based on projectId
		const room = `project:${socket.data.projectId}`;
		socket.join(room);

		// Notify other users in the room that a new user has joined
		socket.to(room).emit("project:joined", socket.data);

		// Emit typing event
		socket.on("user:typing", () => {
			this.emitTypingEvent(
				socket.data.projectId,
				socket.data.userId,
				"user:typing",
				socket
			);
		});

		// Emit stop typing event
		socket.on("user:typing-stop", () => {
			this.emitTypingEvent(
				socket.data.projectId,
				socket.data.userId,
				"user:typing-stop",
				socket
			);
		});

		// Send a chat message
		socket.on("message:send", (data, ack?: (res: unknown) => void) =>
			this.handleMessageSend(socket, data, ack)
		);

		// Emit presence update
		this.updateRoomPresence(socket.data.projectId, socket);
	}

	/**
	 * Handle disconnect event
	 *
	 * @param socket
	 */
	protected on_disconnect(socket: Socket) {
		this.updateRoomPresence(socket.data.projectId, socket);
	}

	/**
	 * Emit typing event to all users in the same project
	 *
	 * @function emitTypingEvent
	 * @param {string} projectId - The ID of the project
	 * @param {string} userId - The ID of the user
	 * @param {"user:typing" | "user:typing-stop"} eventType - The type of the event
	 */
	private emitTypingEvent(
		projectId: string,
		userId: string,
		eventType: "user:typing" | "user:typing-stop",
		socket: Socket
	) {
		const roomName = `project:${projectId}`;
		socket.to(roomName).emit(eventType, {
			projectId,
			userId
		});
	}

	/**
	 * Handle a `message:send` event: validate the payload and publish it to the
	 * `chat.messages` exchange. Persistence + the `message:new` broadcast happen
	 * in the in-process consumer (write-behind), so nothing is emitted here.
	 *
	 * Wrapped in try/catch because socket handlers run outside the request
	 * cycle — the publisher's AppError would otherwise be an unhandled rejection
	 * instead of reaching the global error handler.
	 *
	 * @param socket - The sender's socket (carries projectId/user from handshake)
	 * @param data - Raw `{ content, clientId? }` payload from the client
	 * @param ack - Optional Socket.io acknowledgement callback
	 */
	private async handleMessageSend(
		socket: Socket,
		data: unknown,
		ack?: (res: unknown) => void
	) {
		const parsed = sendMessageSchema.safeParse(data);
		if (!parsed.success) {
			ack?.({ ok: false, error: "Invalid message" });
			return;
		}

		try {
			await chatPublisher.publish(
				{
					projectId: socket.data.projectId,
					senderId: socket.data.userId,
					sender: socket.data.user,
					content: parsed.data.content,
					clientId: parsed.data.clientId
				},
				{
					persistent: true
				},
				"project." + socket.data.projectId + ".message"
			);
			ack?.({ ok: true });
		} catch (err) {
			logger.error("[chat] publish failed:", err);
			ack?.({ ok: false, error: "Failed to send message" });
		}
	}

	/**
	 * Update room presence when user joins the project
	 *
	 * @function updateRoomPresence
	 * @param {string} projectId - The ID of the project
	 */
	private async updateRoomPresence(projectId: string, socket: Socket) {
		const roomName = `project:${projectId}`;
		const users = await this.getOnlineUsers(roomName, socket);
		this.nsp.in(roomName).emit("presence:updated", {
			projectId,
			users,
			count: users.length
		});
	}

	/**
	 * Get all online users in the project
	 *
	 * @function getOnlineUsers
	 * @param {string} roomName - The name of the room
	 * @param {Socket} socket - The socket
	 * @returns {Promise<number[]>} - The list of online users
	 */
	private async getOnlineUsers(roomName: string, socket: Socket) {
		const sockets = await socket.nsp.in(roomName).fetchSockets();
		const byId = new Map<string, SocketData["user"]>();
		for (const s of sockets) {
			if (s.data.user) byId.set(s.data.user.id, s.data.user);
		}
		return [...byId.values()];
	}
}
