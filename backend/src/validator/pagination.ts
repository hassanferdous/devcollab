import z from "zod";

export const paginationSchema = z.object({
	page: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
	search: z.string().optional()
});
