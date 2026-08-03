import { User } from "@/domains/v1/user/service";
import { Namespace, Server, Socket } from "socket.io";
import { BaseNamespace } from "./base.nsp";
import { socketAuthMiddleware } from "./auth.socket";
import { createCommentSchema } from "@/domains/v1/comment/validation";
import { commentPublisher } from "@/domains/v1/comment/worker";
import { TaskServices } from "@/domains/v1/task/service";
import { ProjectServices } from "@/domains/v1/project/service";
import logger from "@/lib/logger";

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

		// Create a comment on a task (card)
		socket.on("comment:create", (data, ack?: (res: unknown) => void) =>
			this.handleCommentCreate(socket, data, ack)
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
	 * Handle a `comment:create` event: validate the payload, verify the target
	 * task belongs to the handshake's project (taskId is client-supplied),
	 * sanitize the mention list to real project members, and publish to the
	 * `comment.events` exchange. Persistence, the `comment:new` broadcast, and
	 * mention-notification fan-out all happen in the in-process consumer
	 * (write-behind), so nothing is emitted here.
	 *
	 * Wrapped in try/catch because socket handlers run outside the request
	 * cycle — the publisher's AppError would otherwise be an unhandled rejection
	 * instead of reaching the global error handler.
	 *
	 * @param socket - The sender's socket (carries projectId/user from handshake)
	 * @param data - Raw `{ taskId, content, mentionedUserIds?, clientId? }` payload
	 * @param ack - Optional Socket.io acknowledgement callback
	 */
	private async handleCommentCreate(
		socket: Socket,
		data: unknown,
		ack?: (res: unknown) => void
	) {
		const parsed = createCommentSchema.safeParse(data);
		if (!parsed.success) {
			ack?.({ ok: false, error: "Invalid comment" });
			return;
		}

		const { taskId, content, mentionedUserIds, clientId } = parsed.data;
		const projectId = Number(socket.data.projectId);
		const senderId = Number(socket.data.userId);

		try {
			// The task id comes from the client — confirm it belongs to the
			// project proven at the handshake before accepting the comment.
			const task = await TaskServices.getById({ taskId, projectId });
			if (!task) {
				ack?.({ ok: false, error: "Task not found" });
				return;
			}

			// Keep only genuine project members as mention recipients; drop self.
			const members = await ProjectServices.getMembers(projectId);
			const memberIds = new Set(members.map((m) => m.user_id));
			const validMentions = [...new Set(mentionedUserIds)].filter(
				(id) => memberIds.has(id) && id !== senderId
			);

			await commentPublisher.init();
			await commentPublisher.publish(
				{
					projectId,
					taskId,
					senderId,
					sender: socket.data.user,
					content,
					mentionedUserIds: validMentions,
					clientId
				},
				{
					persistent: true
				},
				"task." + taskId + ".comment"
			);
			ack?.({ ok: true });
		} catch (err) {
			logger.error("[comment] publish failed:", err);
			ack?.({ ok: false, error: "Failed to send comment" });
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
