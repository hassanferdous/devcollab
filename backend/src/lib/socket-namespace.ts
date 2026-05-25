import { Namespace, Server } from "socket.io";

/**
 * @description Abstract class for creating socket namespaces
 * @param {string} name - The name of the namespace
 * @param {Server} io - The socket instance
 * @returns {void}
 * @abstract
 */
export default abstract class SocketNamespace {
	private name: string;
	private io: Server;
	private namespace: Namespace | null;

	constructor(name: string, io: Server) {
		this.name = name;
		this.io = io;
		this.namespace = null;
		this.init();
	}

	private init() {
		this.namespace = this.io.of(`/${this.name}`);
		this.onConnection(this.namespace);
		this.onDisConnection(this.namespace);
	}

	abstract onConnection(namespace: Namespace): void;
	abstract onDisConnection(namespace: Namespace): void;
}
