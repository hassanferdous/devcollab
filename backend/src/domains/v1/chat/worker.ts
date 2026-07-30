import RabbitMQ from "@/services/rabbitmq";
import { ChatMessagePayload, ChatServices } from "./service";
import { Namespace } from "socket.io";
import { app } from "@/server";

export const chatPublisher = new RabbitMQ({
	name: "chat.messages",
	exchangeType: "topic",
	publishConfirm: "single"
});

export const chatPersistWorker = new RabbitMQ<ChatMessagePayload>({
	name: "chat.messages",
	exchangeType: "topic",
	queue: "chat.persist",
	routingKey: "project.*.message",
	prefetchCount: 1,
	retry: { enabled: true, maxRetries: 3, retryDelayMs: 5000 },
	onConsume: async (payload) => {
		const saved = await ChatServices.create({
			project_id: payload.projectId,
			sender_id: payload.senderId,
			content: payload.content
		});

		const nsp = app.get("projectNsp") as Namespace;

		nsp.to(`project:${payload.projectId}`).emit("message:new", {
			...saved,
			sender: {
				id: payload.sender.id,
				name: payload.sender.name,
				avatar: payload.sender.avatar
			},
			clientId: payload.clientId
		});
	}
});
