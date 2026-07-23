import { Paginated } from "@/types";
import { SQL } from "drizzle-orm";
import { PgColumn, PgSelect } from "drizzle-orm/pg-core";

export type OrderByColumn = PgColumn | SQL | SQL.Aliased;
/**
 * Adds pagination to a query
 *
 * @async
 * @param query
 * @param options
 * @returns {Promise<Paginated<unknown>>} The paginated data
 */
export async function withPagination<T extends PgSelect>(
	qb: T,
	options?: {
		page?: number;
		limit?: number;
		orderByColumn?: OrderByColumn[];
	}
): Promise<Paginated<unknown>> {
	const { orderByColumn } = options || {};
	const page = Number(options?.page) || 1;
	const limit = Number(options?.limit) || 15;
	if (orderByColumn) qb.orderBy(...orderByColumn);
	const data = await qb.limit(limit).offset((page - 1) * limit);
	const count = Number(data?.[0]?.count) || 0;
	const totalPages = Math.ceil(count / limit);
	const hasNext = page < totalPages;
	const hasPrev = page > 1;
	return {
		data: data.map(({ record }) => record),
		pagination: {
			count,
			currentPage: Number(page),
			totalPages,
			hasNext,
			hasPrev,
			prevPage: hasPrev ? page - 1 : null,
			nextPage: hasNext ? page + 1 : null
		}
	};
}
