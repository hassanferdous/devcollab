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

const router = express.Router({
	mergeParams: true
});

/**
 * @route   POST /api/v1/projects/:projectId/tasks
 * @desc    Create a new task record
 * @access  Public
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

		const data = await TaskServices.create(
			{
				...req.body,
				project_id: req.params.projectId,
				created_by: req.user!.id!
			},
			context
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
 * @route   GET /api/v1/projects/:projectId/tasks
 * @desc    Retrieve all task records
 * @access  Public
 */
router.get(
	"/",
	auth,
	validate({ params: projectIdSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const projectId = +req.params.projectId;
		const data = await TaskServices.getAll(projectId);
		ApiResponse.success(
			res,
			"Successfully fetched all task!",
			data,
			StatusCodes.OK
		);
	}
);

/**
 * @route   GET /api/v1/projects/:projectId/tasks/:id
 * @desc    Retrieve a single task record by ID
 * @access  Public
 * @param   {number} id - Unique identifier of the resource
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
 * @route   PATCH /api/v1/projects/:projectId/tasks/:id
 * @desc    Update an existing task record by ID
 * @access  Public
 * @param   {number} id - Unique identifier of the resource
 */
router.patch(
	"/:id",
	auth,
	validate({ params: projectIdAndTaskIdSchema, body: updateTaskSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const data = await TaskServices.update(
			{ taskId: +req.params.id, projectId: +req.params.projectId },
			req.body,
			context
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
 * @route   DELETE /api/v1/projects/:projectId/tasks/:id
 * @desc    Delete a specific task record by ID
 * @access  Public
 * @param   {number} id - Unique identifier of the resource
 */
router.delete(
	"/:id",
	auth,
	validate({ params: projectIdAndTaskIdSchema }),
	projectAccess("Task"),
	async (req: Request, res: Response) => {
		const { id: taskId, projectId } = req.params;
		const context = getRequestContext(req);
		const data = await TaskServices.delete(
			{ taskId: +taskId, projectId: +projectId },
			context
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
