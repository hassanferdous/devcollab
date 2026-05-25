import SocketNamespace from "@/lib/socket-namespace";
import { Server, Namespace, Socket } from "socket.io";

export default class TaskNamespace extends SocketNamespace {
	constructor(io: Server) {
		super("tasks", io);
	}

	onConnection(namespace: Namespace): void {
		namespace.on("connection", (socket: Socket) => {
			console.log("a user connected", socket.id);
		});
	}

	onDisConnection(namespace: Namespace): void {
		namespace.on("disconnect", (socket: Socket) => {
			console.log("user disconnected", socket.id);
		});
	}
}
