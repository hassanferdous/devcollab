import { io, type Socket } from "socket.io-client";
import type {
	ProjectJoinedPayload,
	TaskCreatedPayload,
	TaskDeletedPayload,
	TaskUpdatedPayload,
} from "~/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000";

interface ServerToClientEvents {
	"project:joined": (data: ProjectJoinedPayload) => void;
	"task:created": (data: TaskCreatedPayload) => void;
	"task:updated": (data: TaskUpdatedPayload) => void;
	"task:deleted": (data: TaskDeletedPayload) => void;
	"user:typing": (data: any) => void;
	"user:typing-stop": (data: any) => void;
}

interface ClientToServerEvents {
	"user:typing": (data: any) => void;
	"user:typing-stop": (data: any) => void;
}

type ProjectSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ProjectSocket | null = null;

export function getProjectSocket(projectId?: number): ProjectSocket {
	if (socket?.connected) return socket;

	socket = io(`${SOCKET_URL}/project`, {
		query: projectId ? { projectId } : {},
		transports: ["websocket", "polling"],
		autoConnect: true,
		withCredentials: true,
	});

	return socket;
}

export function disconnectSocket() {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}

export function getSocket(): ProjectSocket | null {
	return socket;
}
