import { z } from "zod";

export const createProjectSchema = z.object({
	name: z.string("Name is required").max(255),
	description: z.string("Description is required").max(255),
	status: z.enum(["active", "archived"]).default("active")
});

export const updateProjectSchema = createProjectSchema.partial();

export const addMemberSchema = z.object({
	action: z.literal("add"),
	role: z.enum(["admin", "member", "viewer"]),
	userId: z.coerce.number("User ID is required").int().positive()
});

export const removeMemberSchema = z.object({
	action: z.literal("remove"),
	userId: z.coerce.number("User ID is required").int().positive()
});

export const updateMemberSchema = z.discriminatedUnion("action", [
	addMemberSchema,
	removeMemberSchema
]);
