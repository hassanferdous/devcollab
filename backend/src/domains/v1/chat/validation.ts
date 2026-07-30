import { paginationSchema } from "@/validator/pagination";
import { z } from "zod";

export const sendMessageSchema = z.object({
	content: z.string().trim().min(1, "Message cannot be empty").max(4000),
	/** Optional client-generated id, echoed back so the sender can reconcile its pending message. */
	clientId: z.string().optional()
});

export type SendMessageSchema = z.infer<typeof sendMessageSchema>;

export const projectIdSchema = z.object({
	projectId: z.coerce.number("ProjectId is required").int().positive()
});

export const messageHistorySchema = paginationSchema;

export type MessageHistorySchema = z.infer<typeof messageHistorySchema>;
