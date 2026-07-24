import config from "@/config";
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";

// ─── Environment ────────────────────────────────────────────────
const IS_DEV = config.isDevelopment;

// ─── Pagination Meta ────────────────────────────────────────────
export type PaginationMeta = {
	count: number;
	currentPage: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
	prevPage: number | null;
	nextPage: number | null;
};

// ─── Base Shape ─────────────────────────────────────────────────
type BaseHTTPResponse = {
	success: boolean;
	statusCode: StatusCodes;
	message: string;
};

// ─── Success Shape ──────────────────────────────────────────────
export type SuccessPayload<T> = BaseHTTPResponse & {
	success: true;
	data: T;
	pagination?: PaginationMeta;
};

// ─── Error Shape ────────────────────────────────────────────────
export type ErrorPayload = BaseHTTPResponse & {
	success: false;
	data: null;
	error: {
		type: string;
		reference: string;
		details?: string; // dev only
		stack?: string[]; // dev only
		context?: RequestContext; // dev only
	};
};

// ─── Dev Context ────────────────────────────────────────────────
type RequestContext = {
	environment: string;
	timestamp: string;
	method: string;
	path: string;
	query: Record<string, unknown>;
	body: Record<string, unknown>;
};

// ─── Reference ID Generator ─────────────────────────────────────
function generateReference(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `ERR-${timestamp}-${random}`;
}

// ─── Build Dev Context from Express Request ──────────────────────
function buildContext(res: Response): RequestContext {
	const req = res.req;
	return {
		environment: process.env.NODE_ENV ?? "development",
		timestamp: new Date().toISOString(),
		method: req.method,
		path: req.path,
		query: (req.query as Record<string, unknown>) ?? {},
		body: (req.body as Record<string, unknown>) ?? {}
	};
}

// ─── ApiResponse ────────────────────────────────────────────────
export const ApiResponse = {
	/**
	 * Send a success response.
	 *
	 * @example
	 * ApiResponse.success(res, "Users fetched", users, StatusCodes.OK, pagination)
	 */
	success<T>(
		res: Response,
		message: string,
		data: T,
		statusCode: StatusCodes = StatusCodes.OK,
		pagination?: PaginationMeta
	): Response {
		const payload: SuccessPayload<T> = {
			success: true,
			statusCode,
			message,
			data,
			...(pagination ? { pagination } : {})
		};

		return res.status(statusCode).json(payload);
	},

	/**
	 * Send an error response.
	 * Stack trace and request context are included only in development.
	 *
	 * @example
	 * ApiResponse.error(res, "Not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND", err)
	 */
	error(
		res: Response,
		message: string,
		statusCode: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR,
		errorType: string = "SERVER_ERROR",
		err?: unknown
	): Response {
		const reference = generateReference();

		const sanitizedErrMessage = (
			IS_DEV ? (err instanceof Error ? err.message : message) : message
		).replace(/\\/g, " ");

		// Always log full error server-side
		console.error(`[${reference}]`, err);

		const payload: ErrorPayload = {
			success: false,
			statusCode,
			message: sanitizedErrMessage,
			data: null,
			error: {
				type: errorType,
				reference,

				// Dev-only fields
				...(IS_DEV && err instanceof Error
					? {
							details: sanitizedErrMessage,
							stack: err.stack?.split("\n").map((l) => l.trim()),
							context: buildContext(res)
						}
					: {})
			}
		};

		return res.status(statusCode).json(payload);
	},

	/**
	 * 204 No Content — for DELETE or PUT with no body.
	 */
	noContent(res: Response): Response {
		return res.status(StatusCodes.NO_CONTENT).send();
	}
} as const;
