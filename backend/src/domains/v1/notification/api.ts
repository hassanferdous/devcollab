import auth from "@/middlewares/auth";
import validate from "@/middlewares/validator";
import { ApiResponse } from "@/utils/response";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { NotificationServices } from "./service";
import {
	notificationHistorySchema,
	NotificationHistorySchema,
	notificationIdSchema
} from "./validation";

const router = express.Router();

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List the current user's notifications (newest first)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Notifications fetched }
 *       401: { description: Unauthorized }
 */
router.get(
	"/",
	auth,
	validate({ query: notificationHistorySchema }),
	async (req: Request, res: Response) => {
		const { page, limit } = req.query as unknown as NotificationHistorySchema;
		const data = await NotificationServices.list(req.user!.id, {
			page,
			limit
		});
		ApiResponse.success(
			res,
			"Successfully fetched notifications!",
			data,
			StatusCodes.OK
		);
	}
);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Unread notification count for the current user
 *     tags: [Notifications]
 *     responses:
 *       200: { description: Unread count }
 */
router.get("/unread-count", auth, async (req: Request, res: Response) => {
	const count = await NotificationServices.unreadCount(req.user!.id);
	ApiResponse.success(res, "Unread count", { count }, StatusCodes.OK);
});

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all of the current user's notifications read
 *     tags: [Notifications]
 *     responses:
 *       200: { description: All marked read }
 */
router.patch("/read-all", auth, async (req: Request, res: Response) => {
	await NotificationServices.markAllRead(req.user!.id);
	ApiResponse.success(res, "All notifications marked read", null, StatusCodes.OK);
});

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Marked read }
 */
router.patch(
	"/:id/read",
	auth,
	validate({ params: notificationIdSchema }),
	async (req: Request, res: Response) => {
		await NotificationServices.markRead(req.user!.id, +req.params.id);
		ApiResponse.success(res, "Notification marked read", null, StatusCodes.OK);
	}
);

export default router;
