import auth from "@/middlewares/auth";
import validate from "@/middlewares/validator";
import { getRequestContext } from "@/utils/getRequestContext";
import { ApiResponse } from "@/utils/response";
import { projectIdSchema } from "@/validator/params";
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
import { getOrSet } from "@/utils/cache";
import redisClient from "@/config/redis";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         owner_id:
 *           type: integer
 *           example: 2
 *         name:
 *           type: string
 *           example: Project DevCollab
 *         description:
 *           type: string
 *           nullable: true
 *           example: Collaborative development portal
 *         status:
 *           type: string
 *           enum: [active, archived]
 *           example: active
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ProjectMember:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         project_id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 3
 *         role:
 *           type: string
 *           enum: [admin, member, viewer]
 *           example: member
 *         joined_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create a new project
 *     description: Creates a new project with the authenticated user as the owner.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: Project DevCollab
 *               description:
 *                 type: string
 *                 example: Collaborative development portal
 *               status:
 *                 type: string
 *                 enum: [active, archived]
 *                 default: active
 *                 example: active
 *     responses:
 *       201:
 *         description: Successfully created new project
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
 *                   example: Successfully created new project!
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
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
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: Retrieve all project records for the authenticated user
 *     description: Returns a list of all projects that the authenticated user owns or is a member of.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched all projects
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
 *                   example: Successfully fetched all project!
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
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
 * @swagger
 * /api/v1/projects/{projectId}:
 *   get:
 *     summary: Retrieve a single project record by projectID
 *     description: Returns detailed project info. Access is restricted to members/owners.
 *     tags: [Projects]
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
 *         description: Successfully fetched project
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
 *                   example: Successfully fetched project!
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No access to project
 *       404:
 *         description: Project not found
 */

router.get(
	"/:projectId",
	auth,
	projectAccess("Project"),
	async (req: Request, res: Response) => {
		const context = getRequestContext(req);
		const id = +req.params.projectId;
		const data = await getOrSet(`project:${id}`, 300, async () => {
			return await ProjectServices.getById(id, context, req.project);
		});

		ApiResponse.success(
			res,
			"Successfully fetched project!",
			data,
			StatusCodes.OK
		);
	}
);

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   put:
 *     summary: Update an existing project record by projectID
 *     description: Updates properties of a project. Access restricted to project managers/owners.
 *     tags: [Projects]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, archived]
 *     responses:
 *       202:
 *         description: Successfully updated project
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
 *                   example: Successfully updated project!
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No edit rights
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
		await redisClient.del(`project:${id}`);
		ApiResponse.success(
			res,
			"Successfully updated project!",
			data,
			StatusCodes.ACCEPTED
		);
	}
);

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   delete:
 *     summary: Delete a project by projectID
 *     description: Permanently deletes a project. Access restricted to project owner.
 *     tags: [Projects]
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
 *       204:
 *         description: Successfully deleted project
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only owner can delete
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
		await redisClient.del(`project:${id}`);
		ApiResponse.success(
			res,
			"Successfully deleted project!",
			data,
			StatusCodes.NO_CONTENT
		);
	}
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/member:
 *   patch:
 *     summary: Add or Remove project members
 *     description: Manages the project member list. Can add a user with a specific role, or remove a member.
 *     tags: [Projects]
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
 *               - action
 *               - userId
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [add, remove]
 *                 example: add
 *               userId:
 *                 type: integer
 *                 example: 3
 *               role:
 *                 type: string
 *                 enum: [admin, member, viewer]
 *                 example: member
 *     responses:
 *       202:
 *         description: Successfully added or removed member
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
 *                   example: Successfully added project member!
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
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
		await redisClient.del(`project:${id}`);
		ApiResponse.success(
			res,
			`Successfully ${req.body.action === "add" ? "added" : "removed"} project member!`,
			data,
			StatusCodes.ACCEPTED
		);
	}
);

export default router;
