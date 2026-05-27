import { BaseNamespace } from "./base.nsp";
import { Server, Socket } from "socket.io";

export class ProjectNamespace extends BaseNamespace {
	constructor(io: Server) {
		super(io, "/project");
	}

	protected on_connect(socket: Socket) {
		socket.join(`project:${socket.data.projectId}`);
	}
}
