import z from "zod";

export const paginationQuerySchema = z.object({
	page: z.coerce.number().optional(),
	pageSize: z.coerce.number().optional(),
	search: z.string().optional(),
	sortBy: z.array(z.string()).optional(),
	sortOrder: z.array(z.enum(["asc", "desc"])).optional()
});
