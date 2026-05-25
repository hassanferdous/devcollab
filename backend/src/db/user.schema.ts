import {
	integer,
	pgTable,
	timestamp,
	varchar,
	boolean
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }),
	email: varchar({ length: 255 }).notNull().unique(),
	password_hash: varchar().notNull(),
	avatar: varchar({ length: 255 }),
	provider: varchar().notNull().default("credential"),
	isActive: boolean().default(true),
	createdAt: timestamp().defaultNow(),
	updatedAt: timestamp().defaultNow(),
	deletedAt: timestamp()
});
