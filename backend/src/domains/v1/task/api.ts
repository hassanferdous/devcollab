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
	createTaskSchema,
	projectIdAndTaskIdSchema,
	projectIdSchema,
	updateTaskSchema
} from "./validation";
import { Namespace } from "socket.io";
import { paginationSchema } from "@/validator/pagination";

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
 *     description: Returns a list of tasks associated with the project. Access restricted to project members.
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
	"/",
	auth,
	validate({ params: projectIdSchema, query: paginationSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const projectId = +req.params.projectId;
		const queryParams = req.query as unknown as {
			limit?: number;
			page?: number;
		};
		const data = await TaskServices.getAll(projectId, {
			limit: queryParams.limit,
			page: queryParams.page
		});
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
		ApiResponse.success(
			res,
			"Successfully deleted task!",
			data,
			StatusCodes.NO_CONTENT
		);
	}
);

export default router;
