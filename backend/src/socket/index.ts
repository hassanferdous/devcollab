import { Server } from "socket.io";
import TaskNamespace from "./tasks";

/**
 * @function setupSocket
 * @param {Server} io - The socket instance
 * @returns {void}
 */
export default function (io: Server) {
	// Register socket namespaces
	new TaskNamespace(io);
}
