import db from "@/config/db";
import {
	taskActivityLogTable,
	taskMembersTable,
	tasksTable
} from "@/db/task.schema";
import { usersTable } from "@/db/user.schema";
import { Paginated } from "@/types";
import { throwError } from "@/utils/error";
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	SQL,
	sql,
	type InferInsertModel,
	type InferSelectModel
} from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import defineAbilityFor, { MemberAbilityContext } from "../project/ability";
import { Namespace } from "socket.io";
import { TaskFilterSchema } from "./validation";
import { OrderByColumn, withPagination } from "@/utils/withPagination";

export type TaskAssignee = {
	user_id: number;
	name: string | null;
	email: string;
	avatar: string | null;
	assigned_at: Date | null;
};

export type Task = InferSelectModel<typeof tasksTable>;
export type NewTask = InferInsertModel<typeof tasksTable>;

export const TaskServices = {
	/**
	 * Persists a new task record to the database
	 *
	 * @param   {NewTask} data - The payload required to build a new entry
	 * @returns {Promise<Task>} The newly instantiated database record
	 */
	create: async (
		data: NewTask,
		context: MemberAbilityContext,
		nsp: Namespace
	): Promise<Task> => {
		const ability = defineAbilityFor(context);
		if (!ability.can("create", "Task"))
			throwError("Permission denied!", StatusCodes.UNAUTHORIZED);
		const result = await db.transaction(async (tx) => {
			const [created] = await tx.insert(tasksTable).values(data).returning();
			await tx.insert(taskActivityLogTable).values({
				task_id: created.id,
				user_id: created.created_by,
				action: "created",
				old_values: {},
				new_values: {
					title: created.title,
					description: created.description,
					status: created.status,
					priority: created.priority,
					project_id: created.project_id,
					created_by: created.created_by,
					start_date: created.start_date,
					due_date: created.due_date
				}
			});
			nsp.to(`project:${created.project_id}`).emit("task:created", created);
			return created;
		});

		return result;
	},

	/**
	 * Resolves a single task entry by its primary identity key
	 *
	 * @param   {number} id - The primary identifier key
	 * @returns {Promise<Task | null>} The record if located, otherwise null
	 */
	getById: async ({
		taskId,
		projectId
	}: {
		taskId: number;
		projectId: number;
	}): Promise<Task> => {
		const result = await db
			.select()
			.from(tasksTable)
			.where(
				and(eq(tasksTable.id, taskId), eq(tasksTable.project_id, projectId))
			);
		if (!result) throwError("Task not found", StatusCodes.NOT_FOUND);
		return result[0];
	},

	/**
	 * Queries and aggregates all records from the task table
	 *
	 * @returns {Promise<Task[]>} An array of all compiled records
	 */
	getAll: async (
		projectId: number,
		{
			page,
			limit,
			assignee_ids,
			priority,
			status,
			sort = "created_at",
			order = "desc"
		}: TaskFilterSchema
	): Promise<Paginated<Task>> => {
		const filters: SQL[] = [eq(tasksTable.project_id, projectId)];
		if (priority) {
			filters.push(eq(tasksTable.priority, priority));
		}
		if (status) {
			filters.push(eq(tasksTable.status, status));
		}
		if (assignee_ids?.length) {
			// Constrain to tasks that have any of the requested assignees.
			// A subquery (not a join) keeps one row per task and avoids
			// dropping unassigned tasks / duplicating multi-assignee tasks.
			filters.push(
				inArray(
					tasksTable.id,
					db
						.select({ id: taskMembersTable.task_id })
						.from(taskMembersTable)
						.where(inArray(taskMembersTable.user_id, assignee_ids))
				)
			);
		}

		const orderBy: OrderByColumn[] = [
			order === "asc"
				? asc(tasksTable[sort as keyof Task])
				: desc(tasksTable[sort as keyof Task])
		];

		const query = db
			.select({ record: tasksTable, count: sql<number>`count(*) over()` })
			.from(tasksTable)
			.where(and(...filters))
			.$dynamic();

		if (!page && !limit) {
			const data = await query.orderBy(...orderBy);
			return {
				data: data.map(({ record }) => record)
			};
		}
		const data = (await withPagination(query, {
			page,
			limit,
			orderByColumn: orderBy
		})) as Paginated<Task>;
		return data;
	},

	/**
	 * Performs a patch update on specific targeted fields for an individual record
	 *
	 * @param   {number} id - The target primary identifier key
	 * @param   {Partial<NewTask>} data - Subset of attributes to be overwritten
	 * @returns {Promise<Task>} The updated record snapshot
	 */
	update: async (
		{
			taskId,
			projectId
		}: {
			taskId: number;
			projectId: number;
		},
		data: Partial<NewTask>,
		context: MemberAbilityContext,
		nsp: Namespace
	): Promise<Task> => {
		const oldTask = await TaskServices.getById({ taskId, projectId });
		const ability = defineAbilityFor(context);
		if (!ability.can("update", "Task"))
			throwError("Unauthorized", StatusCodes.UNAUTHORIZED);

		const result = await db.transaction(async (tx) => {
			const [updated] = await tx
				.update(tasksTable)
				.set(data)
				.where(eq(tasksTable.id, taskId))
				.returning();
			await tx.insert(taskActivityLogTable).values({
				task_id: updated.id,
				user_id: updated.created_by,
				action: "updated",
				old_values: oldTask,
				new_values: {
					title: updated.title,
					description: updated.description,
					status: updated.status,
					priority: updated.priority,
					project_id: updated.project_id,
					created_by: updated.created_by,
					start_date: updated.start_date,
					due_date: updated.due_date
				}
			});
			nsp.to(`project:${updated.project_id}`).emit("task:updated", updated);
			return updated;
		});

		return result;
	},

	getAssignees: async (taskId: number): Promise<TaskAssignee[]> => {
		return db
			.select({
				user_id: usersTable.id,
				name: usersTable.name,
				email: usersTable.email,
				avatar: usersTable.avatar,
				assigned_at: taskMembersTable.assigned_at
			})
			.from(taskMembersTable)
			.innerJoin(usersTable, eq(taskMembersTable.user_id, usersTable.id))
			.where(eq(taskMembersTable.task_id, taskId));
	},

	addAssignees: async (taskId: number, userIds: number[]): Promise<void> => {
		await db
			.insert(taskMembersTable)
			.values(userIds.map((user_id) => ({ task_id: taskId, user_id })))
			.onConflictDoNothing();
	},

	removeAssignee: async (taskId: number, userId: number): Promise<void> => {
		await db
			.delete(taskMembersTable)
			.where(
				and(
					eq(taskMembersTable.task_id, taskId),
					eq(taskMembersTable.user_id, userId)
				)
			);
	},

	/**
	 * Hard deletes a single entry execution loop out of the target collection table
	 * @param   {number} id - The primary identification key target to excise
	 * @returns {Promise<Task>} The residual copy of the expunged record, or null
	 */
	delete: async (
		{ taskId, projectId }: { taskId: number; projectId: number },
		context: MemberAbilityContext,
		nsp: Namespace
	): Promise<Task> => {
		const oldTask = await TaskServices.getById({ taskId, projectId });
		const ability = defineAbilityFor(context);
		if (!ability.can("delete", "Task"))
			throwError("Unauthorized", StatusCodes.UNAUTHORIZED);

		const result = await db.transaction(async (tx) => {
			// Log the deletion while the task still exists (satisfies the FK).
			// Deleting the task then nulls this row's task_id via ON DELETE SET NULL,
			// so the audit entry survives with the full snapshot in old_values.
			await tx.insert(taskActivityLogTable).values({
				task_id: taskId,
				user_id: oldTask.created_by,
				action: "deleted",
				old_values: oldTask
			});
			const [deleted] = await tx
				.delete(tasksTable)
				.where(eq(tasksTable.id, taskId))
				.returning();
			nsp.to(`project:${deleted.project_id}`).emit("task:deleted", deleted);
			return deleted;
		});
		return result;
	}
};
