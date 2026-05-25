import { PaginatedData } from "@/types";
import { SQL } from "drizzle-orm";
import { PgColumn, PgSelect } from "drizzle-orm/pg-core";

type OrderByColumn = PgColumn | SQL | SQL.Aliased;
export async function withPaginationOptions<T extends PgSelect>(
	qb: T,
	page: number = 1,
	pageSize: number = 10,
	orderByColumn?: OrderByColumn[]
): Promise<PaginatedData<unknown>> {
	if (orderByColumn) qb.orderBy(...orderByColumn);
	const data = await qb.limit(pageSize).offset((page - 1) * pageSize);

	return {
		data: data.map(({ record }) => record),
		pagination: {
			count: data?.[0]?.count || 0,
			currentPage: page,
			totalPages: Math.ceil(data.length / pageSize),
			hasNext: page * pageSize < data.length,
			hasPrev: page > 1,
			prevPage: page > 1 ? page - 1 : null,
			nextPage: page * pageSize < data.length ? page + 1 : null
		}
	};
}
