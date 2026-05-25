import { projectIdSchema } from "@/validator/params";
import auth from "@/middlewares/auth";
import validate from "@/middlewares/validator";
import { getRequestContext } from "@/utils/getRequestContext";
import { ApiResponse } from "@/utils/response";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { projectAccess } from "../../../middlewares/project-access";
import { ProjectServices } from "./service";
import {
	createProjectSchema,
	updateMemberSchema,
	updateProjectSchema
} from "./validation";

const router = express.Router();

/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project
 * @access  Private
 * @param   {Object} req.body - Project details
 * @param   {string} req.body.name - Project name
 * @param   {string} req.body.description - Project description
 * @returns {Promise<Project>} Created project
 */
router.post(
	"/",
	auth,
	validate({ body: createProjectSchema }),
	async (req: Request, res: Response) => {
		const data = await ProjectServices.create({
			...req.body,
			owner_id: req.user?.id as number
		});
		ApiResponse.success(
			res,
			"Successfully created new project!",
			data,
			StatusCodes.CREATED
		);
	}
);

/**
 * @route   GET /api/v1/projects
 * @desc    Retrieve all project records for the authenticated user
 * @access  Private
 * @returns {Promise<ProjectWithMember[]>} Array of project records
 */
router.get("/", auth, async (req, res: Response) => {
	const data = await ProjectServices.getAll(req.user!.id!);
	ApiResponse.success(
		res,
		"Successfully fetched all project!",
		data,
		StatusCodes.OK
	);
});

/**
 * @route   GET /api/v1/projects/:projectId
 * @desc    Retrieve a single project record by projectID
 * @access  Private
 * @param   {number} projectId - Unique identifier of the project
 * @returns {Promise<ProjectWithMember>} Project record
 */
router.get(
	"/:projectId",
	auth,
	projectAccess("Project"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const id = +req.params.projectId;
		const data = await ProjectServices.getById(id, context, req.project);
		ApiResponse.success(
			res,
			"Successfully fetched project!",
			data,
			StatusCodes.OK
		);
	}
);

/**
 * @route   PUT /api/v1/projects/:projectId
 * @desc    Update an existing project record by projectID
 * @access  Private
 * @param   {number} projectId - Unique identifier of the project
 * @param   {Object} req.body - Project details
 * @returns {Promise<Project>} Updated project
 */
router.put(
	"/:projectId",
	auth,
	validate({ body: updateProjectSchema, params: projectIdSchema }),
	projectAccess("Project"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const id = +req.params.projectId;
		const data = await ProjectServices.update(id, req.body, context);
		ApiResponse.success(
			res,
			"Successfully updated project!",
			data,
			StatusCodes.ACCEPTED
		);
	}
);

/**
 * @route   DELETE /api/v1/projects/:projectId
 * @desc    Delete a project by projectID
 * @access  Private
 * @param   {number} projectId - Unique identifier of the project
 * @returns {Promise<NoContent>} Deleted project
 */
router.delete(
	"/:projectId",
	auth,
	validate({ params: projectIdSchema }),
	projectAccess("Project"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const id = +req.params.projectId;
		const data = await ProjectServices.delete(id, context);
		ApiResponse.success(
			res,
			"Successfully deleted project!",
			data,
			StatusCodes.NO_CONTENT
		);
	}
);

/**
 * @route PATCH  /api/v1/projects/:projectId/members
 * @desc    Add or Remove project members
 * @access  Private
 * @param   {number} projectId - Unique identifier of the project
 * @param   {Object} req.body - Project details
 * @returns {Promise<Project>} Updated project
 */
router.patch(
	"/:projectId/member",
	auth,
	validate({ params: projectIdSchema, body: updateMemberSchema }),
	projectAccess("Project"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const id = +req.params.projectId;
		const data = await ProjectServices.addOrRemoveMember(
			{
				projectId: id,
				userId: req.body.userId,
				action: req.body.action,
				role: req.body.role
			},
			context
		);
		ApiResponse.success(
			res,
			`Successfully ${req.body.action === "add" ? "added" : "removed"} project member!`,
			data,
			StatusCodes.ACCEPTED
		);
	}
);

export default router;
