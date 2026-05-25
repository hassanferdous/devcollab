/* eslint-disable @typescript-eslint/no-explicit-any */

import { ApiResponse } from "@/utils/response";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError, throwError } from "../utils/error";

export const errorHandler = (
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	if (err instanceof AppError) {
		return ApiResponse.error(res, err.message, err.statusCode, err.errorType, err);
	}

	// Check for PostgreSQL unique constraint violation
	if (err?.cause?.code === "23505") {
		return ApiResponse.error(
			res,
			"Duplicate entry violates unique constraint.",
			StatusCodes.CONFLICT,
			err?.cause?.constraint
		);
	}

	// fallback for unexpected errors
	ApiResponse.error(
		res,
		"Internal Server Error",
		StatusCodes.INTERNAL_SERVER_ERROR,
		"SERVER_ERROR",
		err
	);
};

export const entityParseHandler = (
	err: any,
	_req: Request,
	_res: Response,
	next: NextFunction
) => {
	if (err.type === "entity.parse.failed") {
		return throwError("Invalid JSON payload", StatusCodes.BAD_REQUEST, "");
	}

	next(err);
};
