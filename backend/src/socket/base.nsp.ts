import { Namespace, Server, Socket } from "socket.io";

export abstract class BaseNamespace {
	protected nsp: Namespace;
	constructor(io: Server, namespace: string) {
		this.nsp = io.of(namespace);
		this.registerMiddleware(this.nsp);
		this.listen();
	}

	private listen() {
		this.nsp.on("connection", (socket: Socket) => {
			// eslint-disable-next-line no-console
			console.log(`connected to ${this.nsp.name}`);
			this.on_connect(socket);

			/**
			 * Handle disconnect event
			 */
			socket.on("disconnect", () => {
				// eslint-disable-next-line no-console
				console.log(`disconnected from ${this.nsp.name}`);
				this.on_disconnect(socket);
			});
		});
	}

	/**
	 * Get the namespace
	 *
	 * @returns {Namespace} - The namespace
	 */
	public get(): Namespace {
		return this.nsp;
	}

	/**
	 * Handle connect event
	 * @param socket - The socket
	 */
	protected abstract on_connect(socket: Socket): void;

	/**
	 * Handle disconnect event
	 * @param socket - The socket
	 */
	protected on_disconnect(_socket: Socket): void {}

	/**
	 * Register middleware
	 * @param nsp - The namespace
	 */
	protected registerMiddleware(_nsp: Namespace): void {}
}
