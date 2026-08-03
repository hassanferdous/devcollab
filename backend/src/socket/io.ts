import { config } from "@/config";
import { ProjectNamespace } from "@/socket/project.nsp";
import { NotificationNamespace } from "@/socket/notification.nsp";
import { Express } from "express";
import { createServer, Server as HttpServer } from "http";
import { Server } from "socket.io";

export const initSocketIO = (
	app: Express
): { server: HttpServer; io: Server } => {
	const server = createServer(app);
	const io = new Server(server, {
		cors: {
			origin: config.env.CLIENT_URL,
			credentials: true
		}
	});

	/**
	 * Register namespaces
	 */
	const projectNsp = new ProjectNamespace(io);
	app.set("projectNsp", projectNsp.get());

	const notificationNsp = new NotificationNamespace(io);
	app.set("notificationNsp", notificationNsp.get());

	return { server, io };
};
