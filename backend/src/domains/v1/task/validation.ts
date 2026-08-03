import { paginationSchema } from "@/validator/pagination";
import { z } from "zod";

export const createTaskSchema = z.object({
	title: z.string(),
	description: z.string().max(1000)
});

export const assignTaskSchema = z.object({
	user_id: z.coerce.number({ message: "User is required" })
});

export const addAssigneesSchema = z.object({
	user_ids: z
		.array(z.coerce.number().int().positive())
		.min(1, "At least one user is required")
});

export const updateTaskSchema = createTaskSchema.partial();

export const reorderTasksSchema = z.object({
	status: z.enum(["pending", "in_progress", "completed"]),
	task_ids: z.array(z.coerce.number().int().positive())
});

export type ReorderTasksSchema = z.infer<typeof reorderTasksSchema>;

export const projectIdSchema = z.object({
	projectId: z.coerce.number("ProjectId is required").int().positive()
});

export const projectIdAndTaskIdSchema = z.object({
	projectId: z.coerce.number("ProjectId is required").int().positive(),
	id: z.coerce.number("Task ID is required").int().positive()
});

export const assigneeParamsSchema = z.object({
	projectId: z.coerce.number("ProjectId is required").int().positive(),
	id: z.coerce.number("Task ID is required").int().positive(),
	userId: z.coerce.number("User ID is required").int().positive()
});

export const taskFilterSchema = paginationSchema.extend({
	status: z.enum(["pending", "in_progress", "completed"]).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	assignee_ids: z.array(z.coerce.number().int().positive()).optional(),
	sort: z
		.enum(["position", "created_at", "updated_at", "due_date"])
		.optional()
		.default("position"),
	order: z.enum(["asc", "desc"]).optional().default("asc")
});

export type TaskFilterSchema = z.infer<typeof taskFilterSchema>;
