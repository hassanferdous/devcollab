import db from "@/config/db";
import { messagesTable } from "@/db/message.schema";
import { usersTable } from "@/db/user.schema";
import { Paginated } from "@/types";
import {
	eq,
	sql,
	type InferInsertModel,
	type InferSelectModel
} from "drizzle-orm";
import { MessageHistorySchema } from "./validation";
import { withPagination } from "@/utils/withPagination";

export type Message = InferSelectModel<typeof messagesTable>;
export type NewMessage = InferInsertModel<typeof messagesTable>;

/** Lightweight sender projection embedded in chat payloads. */
export type MessageSender = {
	id: number;
	name: string | null;
	email: string;
	avatar: string | null;
};

/** A persisted message enriched with its sender's public profile. */
export type MessageWithSender = Message & {
	sender: Pick<MessageSender, "id" | "name" | "avatar"> | null;
};

/**
 * The payload published to `chat.messages` on `message:send` and consumed by
 * the persistence worker. `projectId` lives in the body (not just the routing
 * key) so retry/DLQ survive the broker rewriting the routing key.
 */
export type ChatMessagePayload = {
	projectId: number;
	senderId: number;
	sender: MessageSender;
	content: string;
	clientId?: string;
};

export const ChatServices = {
	/**
	 * Persists a chat message. Called by the in-process consumer, not by a
	 * request handler — membership is already enforced at the socket handshake.
	 *
	 * @param   {NewMessage} data - project_id, sender_id and content
	 * @returns {Promise<Message>} The newly persisted record
	 */
	create: async (data: NewMessage): Promise<Message> => {
		const [created] = await db.insert(messagesTable).values(data).returning();
		return created;
	},

	/**
	 * Returns a paginated slice of a project's chat history, newest first, with
	 * each message's sender profile joined in. The client reverses for display.
	 *
	 * @param   {number} projectId - The owning project
	 * @param   {MessageHistorySchema} options - page / limit
	 * @returns {Promise<Paginated<MessageWithSender>>}
	 */
	getHistory: async (
		projectId: number,
		{ page: pageArg, limit: limitArg }: MessageHistorySchema
	): Promise<Paginated<MessageWithSender>> => {
		const page = Number(pageArg) || 1;
		const limit = Number(limitArg) || 15;

		const query = db
			.select({
				record: {
					...messagesTable,
					sender: {
						id: usersTable.id,
						name: usersTable.name,
						avatar: usersTable.avatar
					}
				},
				count: sql<number>`count(*) over()`
			})
			.from(messagesTable)
			.leftJoin(usersTable, eq(messagesTable.sender_id, usersTable.id))
			.where(eq(messagesTable.project_id, projectId))
			.$dynamic();

		const data = (await withPagination(query, {
			page,
			limit
		})) as Paginated<MessageWithSender>;
		return data;
	}
};
