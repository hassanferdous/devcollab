import db from "@/config/db";
import { taskActivityLogTable, tasksTable } from "@/db/task.schema";
import { PaginatedData } from "@/types";
import { throwError } from "@/utils/error";
import { withPaginationOptions } from "@/utils/withPaginationOptions";
import {
	eq,
	sql,
	type InferInsertModel,
	type InferSelectModel
} from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import defineAbilityFor, { MemberAbilityContext } from "../project/ability";

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
		context: MemberAbilityContext
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
				eq(tasksTable.id, taskId) && eq(tasksTable.project_id, projectId)
			);
		if (!result) throwError("Task not found", StatusCodes.NOT_FOUND);
		return result[0];
	},

	/**
	 * Queries and aggregates all records from the task table
	 *
	 * @returns {Promise<Task[]>} An array of all compiled records
	 */
	getAll: async (projectId: number): Promise<PaginatedData<Task>> => {
		const query = db
			.select({ record: tasksTable, count: sql<number>`count(*) over()` })
			.from(tasksTable)
			.where(eq(tasksTable.project_id, projectId));
		const dynamicQuery = query.$dynamic();
		const data = (await withPaginationOptions(
			dynamicQuery,
			1,
			10
		)) as PaginatedData<Task>;
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
		context: MemberAbilityContext
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
			return updated;
		});

		return result;
	},

	/**
	 * Hard deletes a single entry execution loop out of the target collection table
	 * @param   {number} id - The primary identification key target to excise
	 * @returns {Promise<Task>} The residual copy of the expunged record, or null
	 */
	delete: async (
		{ taskId, projectId }: { taskId: number; projectId: number },
		context: MemberAbilityContext
	): Promise<Task> => {
		await TaskServices.getById({ taskId, projectId });
		const ability = defineAbilityFor(context);
		if (!ability.can("delete", "Task"))
			throwError("Unauthorized", StatusCodes.UNAUTHORIZED);

		const result = await db.transaction(async (tx) => {
			const [deleted] = await tx
				.delete(tasksTable)
				.where(eq(tasksTable.id, taskId))
				.returning();
			await tx.insert(taskActivityLogTable).values({
				task_id: deleted.id,
				user_id: deleted.created_by,
				action: "deleted",
				old_values: {
					title: deleted.title,
					description: deleted.description,
					status: deleted.status,
					priority: deleted.priority,
					project_id: deleted.project_id,
					created_by: deleted.created_by,
					start_date: deleted.start_date,
					due_date: deleted.due_date
				}
			});
			return deleted;
		});
		return result;
	}
};
