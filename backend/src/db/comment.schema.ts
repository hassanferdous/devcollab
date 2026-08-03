import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text
} from "drizzle-orm/pg-core";
import { timestamps } from "./column.helpers";
import { projectsTable } from "./project.schema";
import { tasksTable } from "./task.schema";
import { usersTable } from "./user.schema";

/** @description Comments Table — per-task (card) comments, Trello-style */
export const commentsTable = pgTable(
	"comments",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		project_id: integer()
			.notNull()
			.references(() => projectsTable.id, {
				onDelete: "cascade"
			}),
		task_id: integer()
			.notNull()
			.references(() => tasksTable.id, {
				onDelete: "cascade"
			}),
		sender_id: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		content: text().notNull(),
		/** User ids referenced via @mention in `content`; drives notification fan-out. */
		mentioned_user_ids: jsonb().$type<number[]>().notNull().default([]),
		is_edited: boolean().notNull().default(false),
		...timestamps
	},
	(table) => [
		index("idx_comments_task_id_created_at").on(
			table.task_id,
			table.created_at
		),
		index("idx_comments_project_id_created_at").on(
			table.project_id,
			table.created_at
		)
	]
);
