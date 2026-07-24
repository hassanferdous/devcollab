import db from "@/config/db";
import { usersTable } from "@/db/user.schema";
import { throwError } from "@/utils/error";
import {
	projectMembersTable,
	projectRolesEnum,
	projectsTable
} from "@db/project.schema";
import {
	and,
	eq,
	type InferInsertModel,
	type InferSelectModel
} from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { UserServices } from "../user/service";
import defineAbilityFor, { MemberAbilityContext } from "./ability";

export type Project = InferSelectModel<typeof projectsTable>;
export type NewProject = InferInsertModel<typeof projectsTable>;
export type ProjectWithMember = Project & {
	role: (typeof projectRolesEnum.enumValues)[number];
	isMember: boolean;
};

type ProjectMember = InferSelectModel<typeof projectMembersTable>;
type Member = Omit<ProjectMember, "id" | "project_id">;

export const ProjectServices = {
	/**
	 * @description Create a New Project
	 * @function create
	 * @param {NewProject} data
	 * @returns {Promise<Project>}
	 */
	create: async (data: NewProject): Promise<Project> => {
		const result = await db.transaction(async (tx) => {
			const [project] = await tx
				.insert(projectsTable)
				.values(data)
				.returning();
			await tx.insert(projectMembersTable).values({
				user_id: project.owner_id,
				project_id: project.id,
				role: "admin"
			});
			return project;
		});
		return result;
	},

	/**
	 * @description Get Project By ID
	 * @function getById
	 * @param {number} id
	 * @param {MemberAbilityContext} context
	 * @param {ProjectWithMember} project
	 * @returns {Promise<Project | null>}
	 */
	getById: async (
		id: number,
		context: MemberAbilityContext,
		project: ProjectWithMember
	): Promise<Project | null> => {
		const ability = defineAbilityFor(context);
		if (!ability.can("read", context))
			throwError("Unauthorized", StatusCodes.UNAUTHORIZED);

		// Attach members
		const members = await ProjectServices.getMembers(id);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { role, isMember, ...rest } = project;
		const data = {
			...rest,
			members: members
		} as Project & { members: Member[] };

		return data ?? null;
	},

	/**
	 * @description Get All Projects
	 * @function getAll
	 * @param {number} userId
	 * @returns {Promise<Partial<Project>[]>}
	 */
	getAll: async (userId: number): Promise<Partial<Project>[]> => {
		const result = await db
			.select({
				id: projectsTable.id,
				owner_id: projectsTable.owner_id,
				name: projectsTable.name,
				description: projectsTable.description,
				status: projectsTable.status,
				created_at: projectsTable.created_at,
				updated_at: projectsTable.updated_at,
				user_id: projectMembersTable.user_id,
				role: projectMembersTable.role
			})
			.from(projectsTable)
			.innerJoin(
				projectMembersTable,
				and(
					eq(projectMembersTable.project_id, projectsTable.id),
					eq(projectMembersTable.user_id, userId)
				)
			);
		return result;
	},

	/**
	 * @description Update Project
	 * @function update
	 * @param {number} id
	 * @param {Partial<NewProject>} data
	 * @param {MemberAbilityContext} context
	 * @returns {Promise<Project | null>}
	 */
	update: async (
		id: number,
		data: Partial<NewProject>,
		context: MemberAbilityContext
	): Promise<Project | null> => {
		/**
		 * @description Check if user has permission to update the project
		 */
		const ability = defineAbilityFor(context);
		if (!ability.can("update", context))
			throwError("Unauthorized", StatusCodes.UNAUTHORIZED);

		const [updated] = await db
			.update(projectsTable)
			.set(data)
			.where(eq(projectsTable.id, id))
			.returning();
		return updated;
	},

	/**
	 * @description Delete Project
	 * @function delete
	 * @param {number} id
	 * @param {MemberAbilityContext} context
	 * @returns {Promise<Project | null>}
	 */
	delete: async (
		id: number,
		context: MemberAbilityContext
	): Promise<Project | null> => {
		const ability = defineAbilityFor(context);
		if (!ability.can("delete", context))
			throwError("Unauthorized", StatusCodes.UNAUTHORIZED);

		const [deleted] = await db
			.delete(projectsTable)
			.where(eq(projectsTable.id, id))
			.returning();
		return deleted ?? null;
	},

	/**
	 * @description Check if user is a member of the project
	 * @function isMembership
	 * @param {number} userId
	 * @param {number} projectId
	 * @returns {Promise<Project & { isMember: boolean; role: string }>}
	 */
	isMembership: async ({
		userId,
		projectId
	}: {
		userId: number;
		projectId: number;
	}): Promise<
		Project & {
			isMember: boolean;
			role: (typeof projectRolesEnum.enumValues)[number];
		}
	> => {
		const result = await db
			.select({
				id: projectsTable.id,
				owner_id: projectsTable.owner_id,
				name: projectsTable.name,
				description: projectsTable.description,
				status: projectsTable.status,
				created_at: projectsTable.created_at,
				updated_at: projectsTable.updated_at,
				deleted_at: projectsTable.deleted_at,
				role: projectMembersTable.role // Will be null if left join fails to match
			})
			.from(projectsTable)
			.where(eq(projectsTable.id, projectId))
			// Left join allows the row to return even if the user isn't in projectMembersTable
			.leftJoin(
				projectMembersTable,
				and(
					eq(projectMembersTable.project_id, projectsTable.id),
					eq(projectMembersTable.user_id, userId)
				)
			)
			.limit(1);

		const projectRow = result[0];

		// 1. If nothing returns at all, the project explicitly doesn't exist
		if (!projectRow) {
			throwError("Project not found", StatusCodes.NOT_FOUND);
		}

		// 2. If the project exists, but the joined role is null, they aren't a member
		const isMember = projectRow.role !== null;
		if (!isMember) {
			throwError(
				"You are not a member of this project",
				StatusCodes.FORBIDDEN
			);
		}

		return {
			...projectRow,
			isMember: true,
			role: projectRow.role! // Asserting type safely since we guarded against null above
		};
	},

	/**
	 * @description Get All Project Members
	 * @function getMembers
	 * @param {number} projectId
	 * @returns {Promise<Array<ProjectMember>>}
	 */
	getMembers: async (
		projectId: number
	): Promise<Omit<ProjectMember, "id" | "project_id">[]> => {
		const data = await db
			.select({
				user_id: projectMembersTable.user_id,
				role: projectMembersTable.role,
				joined_at: projectMembersTable.joined_at,
				name: usersTable.name,
				email: usersTable.email
			})
			.from(projectMembersTable)
			.leftJoin(usersTable, eq(projectMembersTable.user_id, usersTable.id))
			.where(eq(projectMembersTable.project_id, projectId));
		return data;
	},

	/**
	 * @description Add or Remove Members
	 * @function addOrRemoveMember
	 * @param {object} params
	 * @param {number} params.userId
	 * @param {number} params.projectId
	 * @param {string} params.role
	 * @returns {Promise<noContent>}
	 */
	addOrRemoveMember: async (
		{
			userId,
			projectId,
			role,
			action
		}: {
			userId: number;
			projectId: number;
			role: (typeof projectRolesEnum.enumValues)[number];
			action: "add" | "remove";
		},
		context: MemberAbilityContext
	): Promise<void> => {
		const ability = defineAbilityFor(context);
		if (!ability.can("update", "Project"))
			throwError("Unauthorized", StatusCodes.UNAUTHORIZED);

		await db.transaction(async (tx) => {
			/** @description If action type is remove then remove the user else Add the user */
			if (action === "remove") {
				const [data] = await tx
					.delete(projectMembersTable)
					.where(
						and(
							eq(projectMembersTable.user_id, userId),
							eq(projectMembersTable.project_id, projectId)
						)
					)
					.returning();
				return data;
			}
			const isExistUser = await UserServices.getById(userId);
			if (!isExistUser) throwError("User not found", StatusCodes.NOT_FOUND);
			const [data] = await tx
				.insert(projectMembersTable)
				.values({
					user_id: userId,
					project_id: projectId,
					role: role
				})
				.returning();
			return data;
		});
	}
};
