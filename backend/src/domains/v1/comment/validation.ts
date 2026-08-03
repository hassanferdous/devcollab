import { paginationSchema } from "@/validator/pagination";
import { z } from "zod";

export const createCommentSchema = z.object({
	taskId: z.coerce.number("TaskId is required").int().positive(),
	content: z.string().trim().min(1, "Comment cannot be empty").max(4000),
	/** User ids mentioned in the comment; server re-validates against project members. */
	mentionedUserIds: z.array(z.coerce.number().int().positive()).optional().default([]),
	/** Optional client-generated id, echoed back so the sender can reconcile its pending comment. */
	clientId: z.string().optional()
});

export type CreateCommentSchema = z.infer<typeof createCommentSchema>;

export const taskIdParamsSchema = z.object({
	projectId: z.coerce.number("ProjectId is required").int().positive(),
	taskId: z.coerce.number("TaskId is required").int().positive()
});

export const commentHistorySchema = paginationSchema;

export type CommentHistorySchema = z.infer<typeof commentHistorySchema>;
