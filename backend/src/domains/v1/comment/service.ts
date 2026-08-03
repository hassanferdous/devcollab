import db from "@/config/db";
import { commentsTable } from "@/db/comment.schema";
import { usersTable } from "@/db/user.schema";
import { Paginated } from "@/types";
import {
	and,
	eq,
	sql,
	type InferInsertModel,
	type InferSelectModel
} from "drizzle-orm";
import { CommentHistorySchema } from "./validation";
import { withPagination } from "@/utils/withPagination";

export type Comment = InferSelectModel<typeof commentsTable>;
export type NewComment = InferInsertModel<typeof commentsTable>;

/** Lightweight sender projection embedded in comment payloads. */
export type CommentSender = {
	id: number;
	name: string | null;
	email: string;
	avatar: string | null;
};

/** A persisted comment enriched with its sender's public profile. */
export type CommentWithSender = Comment & {
	sender: Pick<CommentSender, "id" | "name" | "avatar"> | null;
};

/**
 * The payload published to `comment.events` on `comment:create` and consumed by
 * the persistence worker. `projectId`/`taskId` live in the body (not just the
 * routing key) so retry/DLQ survive the broker rewriting the routing key.
 */
export type CommentPayload = {
	projectId: number;
	taskId: number;
	senderId: number;
	sender: CommentSender;
	content: string;
	mentionedUserIds: number[];
	clientId?: string;
};

export const CommentServices = {
	/**
	 * Persists a comment. Called by the in-process consumer, not by a request
	 * handler — membership is already enforced at the socket handshake.
	 *
	 * @param   {NewComment} data - project_id, task_id, sender_id, content, mentioned_user_ids
	 * @returns {Promise<Comment>} The newly persisted record
	 */
	create: async (data: NewComment): Promise<Comment> => {
		const [created] = await db.insert(commentsTable).values(data).returning();
		return created;
	},

	/**
	 * Returns a paginated slice of a task's comment history, newest first, with
	 * each comment's sender profile joined in. The client reverses for display.
	 * Filtered by project_id too so a member can't read another project's task.
	 *
	 * @param   {number} projectId - The owning project
	 * @param   {number} taskId - The owning task (card)
	 * @param   {CommentHistorySchema} options - page / limit
	 * @returns {Promise<Paginated<CommentWithSender>>}
	 */
	getHistory: async (
		projectId: number,
		taskId: number,
		{ page: pageArg, limit: limitArg }: CommentHistorySchema
	): Promise<Paginated<CommentWithSender>> => {
		const page = Number(pageArg) || 1;
		const limit = Number(limitArg) || 15;

		const query = db
			.select({
				record: {
					...commentsTable,
					sender: {
						id: usersTable.id,
						name: usersTable.name,
						avatar: usersTable.avatar
					}
				},
				count: sql<number>`count(*) over()`
			})
			.from(commentsTable)
			.leftJoin(usersTable, eq(commentsTable.sender_id, usersTable.id))
			.where(
				and(
					eq(commentsTable.project_id, projectId),
					eq(commentsTable.task_id, taskId)
				)
			)
			.$dynamic();

		const data = (await withPagination(query, {
			page,
			limit
		})) as Paginated<CommentWithSender>;
		return data;
	}
};
