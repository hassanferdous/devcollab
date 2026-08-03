import { io, type Socket } from "socket.io-client";
import type {
	CommentNewPayload,
	NotificationNewPayload,
	ProjectJoinedPayload,
	TaskCreatedPayload,
	TaskDeletedPayload,
	TaskReorderedPayload,
	TaskUpdatedPayload,
} from "~/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000";

interface ServerToClientEvents {
	"project:joined": (data: ProjectJoinedPayload) => void;
	"task:created": (data: TaskCreatedPayload) => void;
	"task:updated": (data: TaskUpdatedPayload) => void;
	"task:reordered": (data: TaskReorderedPayload) => void;
	"task:deleted": (data: TaskDeletedPayload) => void;
	"comment:new": (data: CommentNewPayload) => void;
	"user:typing": (data: { projectId: number; userId: number }) => void;
	"user:typing-stop": (data: { projectId: number; userId: number }) => void;
	"presence:updated": (data: {
		projectId: number;
		userId: number;
		isOnline: "join" | "leave";
		onlineCount: number;
		users: any[];
	}) => void;
}

interface ClientToServerEvents {
	// The server derives the typing user from the handshake and ignores any arg.
	"user:typing": (data?: unknown) => void;
	"user:typing-stop": (data?: unknown) => void;
	// The server derives projectId/sender from the handshake — client sends the rest.
	"comment:create": (
		data: {
			taskId: number;
			content: string;
			clientId?: string;
			mentionedUserIds: number[];
		},
		ack?: (res: { ok: boolean; error?: string }) => void,
	) => void;
}

type ProjectSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const socketMap = new Map<number | undefined, ProjectSocket>();

export function getProjectSocket(projectId?: number): ProjectSocket {
	const key = projectId;

	if (socketMap.has(key)) {
		const sock = socketMap.get(key)!;
		if (sock.connected) return sock;
	}

	const newSocket = io(`${SOCKET_URL}/project`, {
		query: projectId ? { projectId } : {},
		transports: ["websocket", "polling"],
		autoConnect: true,
		withCredentials: true,
	});

	socketMap.set(key, newSocket);
	return newSocket;
}

export function disconnectSocket(projectId?: number) {
	const key = projectId;
	const sock = socketMap.get(key);
	if (sock) {
		sock.disconnect();
		socketMap.delete(key);
	}
}

export function getSocket(projectId?: number): ProjectSocket | null {
	const key = projectId;
	return socketMap.get(key) ?? null;
}

/* ------------------------------------------------------------------ */
/* Notifications — a single global, per-user socket on `/notifications` */
/* ------------------------------------------------------------------ */

interface NotificationServerToClient {
	"notification:new": (data: NotificationNewPayload) => void;
}

type NotificationSocket = Socket<NotificationServerToClient>;
let notificationSocket: NotificationSocket | null = null;

/** Pooled connection to the global `/notifications` namespace (cookie-authed, no projectId). */
export function getUserSocket(): NotificationSocket {
	if (notificationSocket?.connected) return notificationSocket;
	if (notificationSocket) return notificationSocket;

	notificationSocket = io(`${SOCKET_URL}/notifications`, {
		transports: ["websocket", "polling"],
		autoConnect: true,
		withCredentials: true,
	});
	return notificationSocket;
}

export function disconnectUserSocket() {
	if (notificationSocket) {
		notificationSocket.disconnect();
		notificationSocket = null;
	}
}
