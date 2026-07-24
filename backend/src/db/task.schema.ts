import {
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
export const tasksTable = pgTable("tasks", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	status: taskStatusEnum().default("pending").notNull(),
	priority: taskPriorityEnum().default("low").notNull(),
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
});

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
	(table) => [unique().on(table.task_id, table.user_id)]
);

export const taskActivityActionTypeEnum = pgEnum("task_activity_action_type", [
	"created",
	"updated",
	"deleted"
]);
export const taskActivityLogTable = pgTable("task_activity_log", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	task_id: integer()
		.notNull()
		.references(() => tasksTable.id, {
			onDelete: "cascade"
		}),
	user_id: integer().references(() => usersTable.id, {
		onDelete: "set null"
	}),
	action: taskActivityActionTypeEnum().notNull(),
	old_values: jsonb(),
	new_values: jsonb(),
	...timestamps
});
