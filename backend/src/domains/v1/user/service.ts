import db from "@/config/db";
import { usersTable } from "@db/user.schema";
import { eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;

export const UserServices = {
	create: async (data: NewUser): Promise<User> => {
		const [created] = await db.insert(usersTable).values(data).returning();
		return created;
	},

	getById: async (id: number): Promise<User | null> => {
		const result = await db
			.select()
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

	getAll: async (): Promise<User[]> => {
		return db.select().from(usersTable);
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
