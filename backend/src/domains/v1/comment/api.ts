import auth from "@/middlewares/auth";
import { projectAccess } from "@/middlewares/project-access";
import validate from "@/middlewares/validator";
import { ApiResponse } from "@/utils/response";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { CommentServices } from "./service";
import {
	commentHistorySchema,
	CommentHistorySchema,
	taskIdParamsSchema
} from "./validation";

const router = express.Router({
	mergeParams: true
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         project_id:
 *           type: integer
 *           example: 2
 *         task_id:
 *           type: integer
 *           example: 5
 *         sender_id:
 *           type: integer
 *           example: 1
 *         content:
 *           type: string
 *           example: "Nice work @[Alice Smith](3)!"
 *         mentioned_user_ids:
 *           type: array
 *           items:
 *             type: integer
 *           example: [3]
 *         is_edited:
 *           type: boolean
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         sender:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             name:
 *               type: string
 *               nullable: true
 *               example: Alice Smith
 *             avatar:
 *               type: string
 *               nullable: true
 */

/**
 * @swagger
 * /api/v1/projects/{projectId}/tasks/{taskId}/comments:
 *   get:
 *     summary: Retrieve a task's comment history
 *     description: >
 *       Returns a paginated slice of a card's comments, newest first, each
 *       enriched with its sender's public profile. Access restricted to project
 *       members. Live comments arrive over Socket.io (`comment:new`); this
 *       endpoint backfills history on load.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Successfully fetched comment history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
	"/",
	auth,
	validate({ params: taskIdParamsSchema, query: commentHistorySchema }),
	projectAccess("Comment"),
	async (req: Request, res: Response) => {
		const projectId = +req.params.projectId;
		const taskId = +req.params.taskId;
		const { page, limit } = req.query as unknown as CommentHistorySchema;
		const data = await CommentServices.getHistory(projectId, taskId, {
			page,
			limit
		});
		ApiResponse.success(
			res,
			"Successfully fetched comments!",
			data,
			StatusCodes.OK
		);
	}
);

export default router;
