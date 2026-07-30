import { boolean, index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { timestamps } from "./column.helpers";
import { projectsTable } from "./project.schema";
import { usersTable } from "./user.schema";

/** @description Messages Table — per-project team chat */
export const messagesTable = pgTable(
	"messages",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		project_id: integer()
			.notNull()
			.references(() => projectsTable.id, {
				onDelete: "cascade"
			}),
		sender_id: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		content: text().notNull(),
		is_edited: boolean().notNull().default(false),
		...timestamps
	},
	(table) => [
		index("idx_messages_project_id_created_at").on(
			table.project_id,
			table.created_at
		)
	]
);
