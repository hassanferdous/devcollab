import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text
} from "drizzle-orm/pg-core";
import { timestamps } from "./column.helpers";
import { commentsTable } from "./comment.schema";
import { projectsTable } from "./project.schema";
import { tasksTable } from "./task.schema";
import { usersTable } from "./user.schema";

/** Notification kinds. Extend the enum as new notification sources are added. */
export const notificationTypeEnum = pgEnum("notification_type", [
	"comment_mention"
]);

/** @description Notifications Table — per-user, persistent (bell + inbox) */
export const notificationsTable = pgTable(
	"notifications",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		/** Recipient. */
		user_id: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		/** Who triggered it (the mentioner). */
		actor_id: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		type: notificationTypeEnum().notNull(),
		project_id: integer().references(() => projectsTable.id, {
			onDelete: "cascade"
		}),
		task_id: integer().references(() => tasksTable.id, {
			onDelete: "cascade"
		}),
		comment_id: integer().references(() => commentsTable.id, {
			onDelete: "cascade"
		}),
		/** Short text preview of the comment (may contain @[Name](id) tokens). */
		preview: text(),
		is_read: boolean().notNull().default(false),
		...timestamps
	},
	(table) => [
		index("idx_notifications_user_id_created_at").on(
			table.user_id,
			table.created_at
		),
		index("idx_notifications_user_id_is_read").on(
			table.user_id,
			table.is_read
		)
	]
);
