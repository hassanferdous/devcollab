import db from "@/config/db";
import { Paginated } from "@/types";
import { withPagination } from "@/utils/withPagination";
import { usersTable } from "@db/user.schema";
import {
	ilike,
	or,
	sql,
	eq,
	type InferInsertModel,
	type InferSelectModel,
	SQL,
	getTableColumns
} from "drizzle-orm";

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;

export const UserServices = {
	create: async (data: NewUser): Promise<User> => {
		const [created] = await db.insert(usersTable).values(data).returning();
		return created;
	},

	getById: async (id: number): Promise<Omit<User, "password_hash"> | null> => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password_hash, ...rest } = getTableColumns(usersTable);
		const result = await db
			.select({ ...rest })
			.from(usersTable)
			.where(eq(usersTable.id, id));
		return result[0] ?? null;
	},

	findByEmail: async (email: string): Promise<User | null> => {
		const result = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.email, email));
		return result[0] ?? null;
	},

	getAll: async ({
		search,
		page,
		limit
	}: {
		search?: string;
		page?: number;
		limit?: number;
	} = {}): Promise<Paginated<User>> => {
		const filters: SQL[] = [];
		const term = `%${search}%`;
		if (search) {
			filters.concat([
				ilike(usersTable.email, term),
				ilike(usersTable.name, term)
			]);
		}
		const query = db
			.select({ record: usersTable, count: sql<number>`count(*) over()` })
			.from(usersTable)
			.where(or(...filters));

		return withPagination(query.$dynamic(), { limit, page }) as Promise<
			Paginated<User>
		>;
	},

	update: async (id: number, data: Partial<NewUser>): Promise<User | null> => {
		const [updated] = await db
			.update(usersTable)
			.set(data)
			.where(eq(usersTable.id, id))
			.returning();
		return updated ?? null;
	},

	delete: async (id: number): Promise<User | null> => {
		const [deleted] = await db
			.delete(usersTable)
			.where(eq(usersTable.id, id))
			.returning();
		return deleted ?? null;
	}
};
