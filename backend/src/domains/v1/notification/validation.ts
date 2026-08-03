import { paginationSchema } from "@/validator/pagination";
import { z } from "zod";

export const notificationHistorySchema = paginationSchema;
export type NotificationHistorySchema = z.infer<typeof notificationHistorySchema>;

export const notificationIdSchema = z.object({
	id: z.coerce.number("Notification id is required").int().positive()
});
