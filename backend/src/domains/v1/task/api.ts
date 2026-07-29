import auth from "@/middlewares/auth";
import { projectAccess } from "@/middlewares/project-access";
import validate from "@/middlewares/validator";
import { getRequestContext } from "@/utils/getRequestContext";
import { ApiResponse } from "@/utils/response";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { TaskServices } from "./service";
import {
	addAssigneesSchema,
	assigneeParamsSchema,
	createTaskSchema,
	projectIdAndTaskIdSchema,
	projectIdSchema,
	TaskFilterSchema,
	taskFilterSchema,
	updateTaskSchema
} from "./validation";
import { Namespace } from "socket.io";
import redisClient from "@/services/redis";
import { getOrSet } from "@/utils/cache";

const router = express.Router({
	mergeParams: true
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Design DB schema
 *         description:
 *           type: string
 *           nullable: true
 *           example: Design schemas for tasks and auth
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *           example: pending
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           example: low
 *         project_id:
 *           type: integer
 *           example: 2
 *         created_by:
 *           type: integer
 *           example: 1
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         due_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/projects/{projectId}/tasks:
 *   post:
 *     summary: Create a new task record
 *     description: Creates a new task within the specified project. Access restricted to project members.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 example: Implement Auth
 *               description:
 *                 type: string
 *                 example: Setup login and register routes
 *     responses:
 *       201:
 *         description: Successfully created new task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Successfully created new task!
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No access to create task
 */
router.post(
	"/",
	auth,
	validate({
		body: createTaskSchema,
		params: projectIdSchema
	}),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const nsp = req.app.get("projectNsp") as Namespace;
		const data = await TaskServices.create(
			{
				...req.body,
				project_id: req.params.projectId,
				created_by: req.user!.id!
			},
			context,
			nsp
		);
		await redisClient.incr(`tasks:${req.params.projectId}:version`);
		ApiResponse.success(
			res,
			"Successfully created new task!",
			data,
			StatusCodes.CREATED
		);
	}
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/tasks:
 *   get:
 *     summary: Retrieve all task records for a project
 *     description: >
 *       Returns a paginated list of tasks for the project, with optional
 *       filtering by status, priority and assignee, plus sorting. Access
 *       restricted to project members. Omit `page` and `limit` to return the
 *       full (unpaginated) list.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the project
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (1-based). Omit together with `limit` for the full list.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page size.
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *         description: Filter by task status.
 *       - in: query
 *         name: priority
 *         required: false
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by task priority.
 *       - in: query
 *         name: assignee_ids
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: true
 *         description: Return only tasks assigned to any of these user IDs.
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, due_date]
 *           default: created_at
 *         description: Field to sort by.
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction.
 *     responses:
 *       200:
 *         description: Successfully fetched all tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully fetched all task!
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 42
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     hasNext:
 *                       type: boolean
 *                       example: true
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *                     prevPage:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     nextPage:
 *                       type: integer
 *                       nullable: true
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
	"/",
	auth,
	validate({ params: projectIdSchema, query: taskFilterSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const projectId = +req.params.projectId;
		const queryParams = req.query as unknown as TaskFilterSchema;

		const version =
			(await redisClient.get(`tasks:${projectId}:version`)) || 1;
		const cacheKey = `tasks:${projectId}:v:${version}:${JSON.stringify(
			queryParams
		)}`;
		const data = await getOrSet(cacheKey, 60, () =>
			TaskServices.getAll(projectId, {
				limit: queryParams.limit,
				page: queryParams.page,
				assignee_ids: queryParams.assignee_ids,
				priority: queryParams.priority,
				status: queryParams.status,
				sort: queryParams.sort,
				order: queryParams.order
			})
		);

		ApiResponse.success(
			res,
			"Successfully fetched all task!",
			data,
			StatusCodes.OK
		);
	}
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/tasks/{id}:
 *   get:
 *     summary: Retrieve a single task record by ID
 *     description: Returns detailed information for a specific task. Access restricted to project members.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the project
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the task
 *     responses:
 *       200:
 *         description: Successfully fetched task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully fetched task!
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.get(
	"/:id",
	auth,
	validate({ params: projectIdAndTaskIdSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const { id: taskId, projectId } = req.params;
		const data = await TaskServices.getById({
			taskId: +taskId,
			projectId: +projectId
		});
		ApiResponse.success(
			res,
			"Successfully fetched task!",
			data,
			StatusCodes.OK
		);
	}
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/tasks/{id}:
 *   patch:
 *     summary: Update an existing task record by ID
 *     description: Updates properties of a task. Access restricted to project members.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the project
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       202:
 *         description: Successfully updated task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 202
 *                 message:
 *                   type: string
 *                   example: Successfully updated task!
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch(
	"/:id",
	auth,
	validate({ params: projectIdAndTaskIdSchema, body: updateTaskSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const nsp = req.app.get("projectNsp") as Namespace;
		const data = await TaskServices.update(
			{ taskId: +req.params.id, projectId: +req.params.projectId },
			req.body,
			context,
			nsp
		);
		await redisClient.incr(`tasks:${req.params.projectId}:version`);
		ApiResponse.success(
			res,
			"Successfully updated task!",
			data,
			StatusCodes.ACCEPTED
		);
	}
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/tasks/{id}:
 *   delete:
 *     summary: Delete a specific task record by ID
 *     description: Removes a task from the project. Access restricted to project members.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the project
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the task
 *     responses:
 *       204:
 *         description: Successfully deleted task
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete(
	"/:id",
	auth,
	validate({ params: projectIdAndTaskIdSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const { id: taskId, projectId } = req.params;
		const context = getRequestContext(req);
		const nsp = req.app.get("projectNsp") as Namespace;
		const data = await TaskServices.delete(
			{ taskId: +taskId, projectId: +projectId },
			context,
			nsp
		);
		await redisClient.incr(`tasks:${req.params.projectId}:version`);
		ApiResponse.success(
			res,
			"Successfully deleted task!",
			data,
			StatusCodes.NO_CONTENT
		);
	}
);

router.get(
	"/:id/assignees",
	auth,
	validate({ params: projectIdAndTaskIdSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const data = await TaskServices.getAssignees(+req.params.id);

		ApiResponse.success(
			res,
			"Successfully fetched assignees!",
			data,
			StatusCodes.OK
		);
	}
);

router.post(
	"/:id/assignees",
	auth,
	validate({ params: projectIdAndTaskIdSchema, body: addAssigneesSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		await TaskServices.addAssignees(+req.params.id, req.body.user_ids);
		await redisClient.incr(`tasks:${req.params.projectId}:version`);
		ApiResponse.success(res, "Assignees added!", null, StatusCodes.ACCEPTED);
	}
);

router.delete(
	"/:id/assignees/:userId",
	auth,
	validate({ params: assigneeParamsSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		await TaskServices.removeAssignee(+req.params.id, +req.params.userId);
		await redisClient.incr(`tasks:${req.params.projectId}:version`);
		ApiResponse.success(
			res,
			"Assignee removed!",
			null,
			StatusCodes.NO_CONTENT
		);
	}
);

export default router;
