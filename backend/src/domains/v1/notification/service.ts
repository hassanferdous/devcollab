import db from "@/config/db";
import { notificationsTable } from "@/db/notification.schema";
import { usersTable } from "@/db/user.schema";
import { app } from "@/server";
import { Paginated } from "@/types";
import {
	and,
	eq,
	sql,
	type InferInsertModel,
	type InferSelectModel
} from "drizzle-orm";
import { Namespace } from "socket.io";
import { CommentSender } from "../comment/service";
import { NotificationHistorySchema } from "./validation";
import { withPagination } from "@/utils/withPagination";

export type Notification = InferSelectModel<typeof notificationsTable>;
export type NewNotification = InferInsertModel<typeof notificationsTable>;

export type NotificationActor = {
	id: number;
	name: string | null;
	avatar: string | null;
};

export type NotificationWithActor = Notification & {
	actor: NotificationActor | null;
};

export const NotificationServices = {
	/**
	 * Persists one mention notification per recipient, then pushes each over the
	 * `/notifications` socket namespace to that user's private room with a fresh
	 * unread count. Called from the comment persist worker (write-behind).
	 */
	fanOutMentions: async ({
		recipients,
		actorId,
		actor,
		projectId,
		taskId,
		commentId,
		preview
	}: {
		recipients: number[];
		actorId: number;
		actor: CommentSender;
		projectId: number;
		taskId: number;
		commentId: number;
		preview: string;
	}): Promise<void> => {
		if (recipients.length === 0) return;

		const rows: NewNotification[] = recipients.map((user_id) => ({
			user_id,
			actor_id: actorId,
			type: "comment_mention",
			project_id: projectId,
			task_id: taskId,
			comment_id: commentId,
			preview
		}));

		const created = await db
			.insert(notificationsTable)
			.values(rows)
			.returning();

		const nsp = app.get("notificationNsp") as Namespace | undefined;
		if (!nsp) return;

		for (const notification of created) {
			const unreadCount = await NotificationServices.unreadCount(
				notification.user_id
			);
			nsp.to(`user:${notification.user_id}`).emit("notification:new", {
				notification: {
					...notification,
					actor: {
						id: actor.id,
						name: actor.name,
						avatar: actor.avatar
					}
				},
				unreadCount
			});
		}
	},

	/** Paginated notifications for a user, newest first, actor profile joined. */
	list: async (
		userId: number,
		{ page: pageArg, limit: limitArg }: NotificationHistorySchema
	): Promise<Paginated<NotificationWithActor>> => {
		const page = Number(pageArg) || 1;
		const limit = Number(limitArg) || 15;

		const query = db
			.select({
				record: {
					...notificationsTable,
					actor: {
						id: usersTable.id,
						name: usersTable.name,
						avatar: usersTable.avatar
					}
				},
				count: sql<number>`count(*) over()`
			})
			.from(notificationsTable)
			.leftJoin(usersTable, eq(notificationsTable.actor_id, usersTable.id))
			.where(eq(notificationsTable.user_id, userId))
			.orderBy(sql`${notificationsTable.created_at} desc`)
			.$dynamic();

		return (await withPagination(query, {
			page,
			limit
		})) as Paginated<NotificationWithActor>;
	},

	/** Number of unread notifications for a user. */
	unreadCount: async (userId: number): Promise<number> => {
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(notificationsTable)
			.where(
				and(
					eq(notificationsTable.user_id, userId),
					eq(notificationsTable.is_read, false)
				)
			);
		return Number(row?.count) || 0;
	},

	/** Mark a single notification read (ownership-guarded). */
	markRead: async (userId: number, id: number): Promise<void> => {
		await db
			.update(notificationsTable)
			.set({ is_read: true })
			.where(
				and(
					eq(notificationsTable.id, id),
					eq(notificationsTable.user_id, userId)
				)
			);
	},

	/** Mark all of a user's notifications read. */
	markAllRead: async (userId: number): Promise<void> => {
		await db
			.update(notificationsTable)
			.set({ is_read: true })
			.where(
				and(
					eq(notificationsTable.user_id, userId),
					eq(notificationsTable.is_read, false)
				)
			);
	}
};
