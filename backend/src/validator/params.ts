import { z } from "zod";

export const idSchema = z.object({
	id: z.coerce.number("ID is required").int().positive()
});

export const projectIdSchema = z.object({
	projectId: z.coerce.number("ID is required").int().positive()
});
