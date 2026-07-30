import auth from "@/middlewares/auth";
import { projectAccess } from "@/middlewares/project-access";
import validate from "@/middlewares/validator";
import { ApiResponse } from "@/utils/response";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { ChatServices } from "./service";
import {
	messageHistorySchema,
	MessageHistorySchema,
	projectIdSchema
} from "./validation";

const router = express.Router({
	mergeParams: true
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         project_id:
 *           type: integer
 *           example: 2
 *         sender_id:
 *           type: integer
 *           example: 1
 *         content:
 *           type: string
 *           example: Hey team, standup in 5!
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
 * /api/v1/projects/{projectId}/chat/messages:
 *   get:
 *     summary: Retrieve a project's chat history
 *     description: >
 *       Returns a paginated slice of the project's chat messages, newest first,
 *       each enriched with its sender's public profile. Access restricted to
 *       project members. Live messages arrive over Socket.io (`message:new`);
 *       this endpoint backfills history on load.
 *     tags: [Chat]
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
 *         description: Page number (1-based).
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page size (default 15).
 *     responses:
 *       200:
 *         description: Successfully fetched chat history
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
 *                   example: Successfully fetched chat history!
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *                     pagination:
 *                       type: object
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
	"/messages",
	auth,
	validate({ params: projectIdSchema, query: messageHistorySchema }),
	projectAccess("Message"),
	async (req: Request, res: Response) => {
		const projectId = +req.params.projectId;
		const { page, limit } = req.query as unknown as MessageHistorySchema;
		const data = await ChatServices.getHistory(projectId, { page, limit });
		ApiResponse.success(
			res,
			"Successfully fetched chat history!",
			data,
			StatusCodes.OK
		);
	}
);

export default router;
