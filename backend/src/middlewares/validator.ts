import { throwError } from "@/utils/error";
import { formatZodError } from "@/utils/formatZodError";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError, ZodSchema } from "zod";

type ValidationSchemas = {
	body?: ZodSchema;
	query?: ZodSchema;
	params?: ZodSchema;
};

export default function validator(schemas: ValidationSchemas) {
	return (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (schemas.body) {
				schemas.body.parse(req.body);
			}
			if (schemas.query) {
				schemas.query.parse(req.query);
			}
			if (schemas.params) {
				schemas.params.parse(req.params);
			}
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				const errorDetails = formatZodError(error)
					.map((e) => `${e.field}: ${e.message}`)
					.join(", ");
				throwError(
					`Validation failed: ${errorDetails}`,
					StatusCodes.BAD_REQUEST,
					"VALIDATION_ERROR"
				);
			}
			throwError("Validation failed", StatusCodes.BAD_REQUEST);
		}
	};
}
