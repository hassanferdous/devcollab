import { z } from "zod";

export const createTaskSchema = z.object({
	title: z.string(),
	description: z.string().max(1000)
});

export const assignTaskSchema = z.object({
	user_id: z.coerce.number({ message: "User is required" })
});

export const updateTaskSchema = createTaskSchema.partial();

export const projectIdSchema = z.object({
	projectId: z.coerce.number("ProjectId is required").int().positive()
});

export const projectIdAndTaskIdSchema = z.object({
	projectId: z.coerce.number("ProjectId is required").int().positive(),
	id: z.coerce.number("Task ID is required").int().positive()
});
