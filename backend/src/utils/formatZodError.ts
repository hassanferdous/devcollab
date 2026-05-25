// utils/formatZodError.ts
import { ZodError } from "zod";

export const formatZodError = (error: ZodError) => {
	return error.issues.map((err) => ({
		field: err.path.join("."),
		message: err.message
	}));
};
