import { Server } from "socket.io";
import { config } from "@/config";
import { Express } from "express";
import { createServer, Server as HttpServer } from "http";
import socket from "@/socket";

export const useSocket = (app: Express): { server: HttpServer; io: Server } => {
	const server = createServer(app);
	const io = new Server(server, {
		cors: {
			origin: config.env.CLIENT_URL,
			credentials: true
		}
	});

	socket(io);

	return { server, io };
};
