import {
	integer,
	pgTable,
	varchar,
	pgEnum,
	jsonb,
	timestamp
} from "drizzle-orm/pg-core";
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
	description: varchar({ length: 255 }),
	status: taskStatusEnum().default("pending"),
	priority: taskPriorityEnum().default("low"),
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
	created_at: timestamp().defaultNow(),
	updated_at: timestamp().defaultNow()
});

export const taskMembersTable = pgTable("task_members", {
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
});

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
	user_id: integer()
		.notNull()
		.references(() => usersTable.id, {
			onDelete: "set null"
		}),
	action: taskActivityActionTypeEnum().notNull(),
	old_values: jsonb(),
	new_values: jsonb(),
	created_at: timestamp().defaultNow()
});
