import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	varchar
} from "drizzle-orm/pg-core";
import { timestamps } from "./column.helpers";
import { projectsTable } from "./project.schema";
import { usersTable } from "./user.schema";

/** @description Tasks Table */
export const taskStatusEnum = pgEnum("task_status", [
	"pending",
	"in_progress",
	"completed"
]);
export const taskPriorityEnum = pgEnum("task_priority", [
	"low",
	"medium",
	"high",
	"urgent"
]);
export const tasksTable = pgTable(
	"tasks",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		title: varchar({ length: 255 }).notNull(),
		description: text(),
		status: taskStatusEnum().default("pending").notNull(),
		priority: taskPriorityEnum().default("low").notNull(),
		// Manual sort order within a (project, status) column, ascending.
		position: integer().default(0).notNull(),
		project_id: integer()
			.notNull()
			.references(() => projectsTable.id, {
				onDelete: "cascade"
			}),
		created_by: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		start_date: timestamp(),
		due_date: timestamp(),
		...timestamps
	},
	(table) => [
		index("idx_tasks_project_id_created_at").on(
			table.project_id,
			table.created_at
		),
		index("idx_tasks_project_id_status").on(table.project_id, table.status),
		index("idx_tasks_project_id_status_position").on(
			table.project_id,
			table.status,
			table.position
		),
		index("idx_tasks_created_by").on(table.created_by)
	]
);

export const taskMembersTable = pgTable(
	"task_members",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		task_id: integer()
			.notNull()
			.references(() => tasksTable.id, {
				onDelete: "cascade"
			}),
		user_id: integer()
			.notNull()
			.references(() => usersTable.id, {
				onDelete: "cascade"
			}),
		assigned_at: timestamp().defaultNow()
	},
	(table) => [
		unique().on(table.task_id, table.user_id),
		index("idx_task_members_user_id").on(table.user_id)
	]
);

export const taskActivityActionTypeEnum = pgEnum("task_activity_action_type", [
	"created",
	"updated",
	"deleted"
]);
export const taskActivityLogTable = pgTable(
	"task_activity_log",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		task_id: integer().references(() => tasksTable.id, {
			onDelete: "set null"
		}),
		user_id: integer().references(() => usersTable.id, {
			onDelete: "set null"
		}),
		action: taskActivityActionTypeEnum().notNull(),
		old_values: jsonb(),
		new_values: jsonb(),
		...timestamps
	},
	(table) => [
		index("idx_task_activity_task_id").on(table.task_id),
		index("idx_task_activity_user_id").on(table.user_id)
	]
);
