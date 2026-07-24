import { boolean, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./column.helpers";

export const usersTable = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }),
	email: varchar({ length: 255 }).notNull().unique(),
	password_hash: varchar(),
	avatar: varchar({ length: 255 }),
	provider: varchar({ length: 255 }).notNull().default("credential"),
	isActive: boolean().notNull().default(true),
	...timestamps
});
