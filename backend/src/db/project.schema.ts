import {
	integer,
	pgTable,
	timestamp,
	varchar,
	pgEnum,
	unique
} from "drizzle-orm/pg-core";
import { usersTable } from "./user.schema";
import { timestamps } from "./column.helpers";

export const projectStatusEnum = pgEnum("project_status", [
	"active",
	"archived"
]);

export const projectsTable = pgTable(
	"projects",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		owner_id: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		name: varchar({ length: 255 }).notNull(),
		description: varchar({ length: 255 }),
		status: projectStatusEnum().default("active"),
		...timestamps
	},
	(table) => [unique().on(table.owner_id, table.name)]
);

/**
 * @description Project Members table
 */
export const projectRolesEnum = pgEnum("project_roles", [
	"admin",
	"member",
	"viewer"
]);
export const projectMembersTable = pgTable(
	"project_members",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		project_id: integer()
			.notNull()
			.references(() => projectsTable.id, {
				onDelete: "cascade"
			}),
		user_id: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		role: projectRolesEnum().notNull().default("member"),
		joined_at: timestamp().defaultNow()
	},
	(table) => [unique().on(table.project_id, table.user_id)]
);
