import RabbitMQ from "@/services/rabbitmq";
import { CommentPayload, CommentServices } from "./service";
import { Namespace } from "socket.io";
import { app } from "@/server";
import { NotificationServices } from "@/domains/v1/notification/service";

export const commentPublisher = new RabbitMQ({
	name: "comment.events",
	exchangeType: "topic",
	publishConfirm: "single"
});

export const commentPersistWorker = new RabbitMQ<CommentPayload>({
	name: "comment.events",
	exchangeType: "topic",
	queue: "comment.persist",
	routingKey: "task.*.comment",
	prefetchCount: 1,
	retry: { enabled: true, maxRetries: 3, retryDelayMs: 5000 },
	onConsume: async (payload) => {
		const saved = await CommentServices.create({
			project_id: payload.projectId,
			task_id: payload.taskId,
			sender_id: payload.senderId,
			content: payload.content,
			mentioned_user_ids: payload.mentionedUserIds
		});

		const projectNsp = app.get("projectNsp") as Namespace;

		// Broadcast to the whole project room; clients filter by task_id.
		projectNsp.to(`project:${payload.projectId}`).emit("comment:new", {
			...saved,
			sender: {
				id: payload.sender.id,
				name: payload.sender.name,
				avatar: payload.sender.avatar
			},
			clientId: payload.clientId
		});

		// Fan out mention notifications (exclude the author, dedupe).
		const recipients = [...new Set(payload.mentionedUserIds)].filter(
			(id) => id !== payload.senderId
		);
		if (recipients.length === 0) return;

		await NotificationServices.fanOutMentions({
			recipients,
			actorId: payload.senderId,
			actor: payload.sender,
			projectId: payload.projectId,
			taskId: payload.taskId,
			commentId: saved.id,
			preview: payload.content.slice(0, 140)
		});
	}
});
