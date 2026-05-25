import { StatusCodes } from "http-status-codes";

export class AppError extends Error {
	constructor(
		public readonly message: string,
		public readonly statusCode: StatusCodes,
		public readonly errorType: string = "APP_ERROR", // ← add this if missing
		public readonly isOperational: boolean = true
	) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
		Error.captureStackTrace(this, this.constructor);
	}
}

export function throwError(
	message: string,
	statusCode: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR,
	errorType: string = "APP_ERROR"
): never {
	throw new AppError(message, statusCode, errorType);
}
