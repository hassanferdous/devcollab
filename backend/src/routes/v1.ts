import config from "@/config/index";
import { ApiResponse } from "@/utils/response";
import type { Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";

/* Import domains routes */
import { default as authRouter } from "@/domains/v1/auth/api";
import { default as userRouter } from "@/domains/v1/user/api";
import { default as projectRouter } from "@/domains/v1/project/api";
import { default as taskRouter } from "@/domains/v1/task/api";
import { default as commentRouter } from "@/domains/v1/comment/api";
import { default as notificationRouter } from "@/domains/v1/notification/api";

const router = express.Router();

/**
 * @swagger
 * /api/v1/:
 *   get:
 *     summary: Welcome route
 *     description: Returns a welcome message with api version and environment mode.
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Success welcome message
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
 *                   example: Welcome to DevCollab
 *                 data:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                       example: 1.0.0
 *                     mode:
 *                       type: string
 *                       example: development
 */
router.get("/", (_, res: Response) => {
	ApiResponse.success(
		res,
		"Welcome to DevCollab",
		{
			version: "1.0.0",
			mode: config.env.NODE_ENV
		},
		StatusCodes.OK
	);
});

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check route
 *     description: Checks if the API is running correctly.
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API status is healthy
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
 *                   example: API is running
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 */
router.get("/health", (_, res: Response) => {
	ApiResponse.success(
		res,
		"API is running",
		{
			status: "ok"
		},
		StatusCodes.OK
	);
});

/***** Auth routes *****/
router.use("/auth", authRouter);

/***** User routes *****/
router.use("/users", userRouter);

/***** Project routes *****/
router.use("/projects", projectRouter);

/** @description Tasks Routes */
router.use("/projects/:projectId/tasks", taskRouter);

/** @description Comment Routes (per-task / card comments) */
router.use("/projects/:projectId/tasks/:taskId/comments", commentRouter);

/** @description Notification Routes */
router.use("/notifications", notificationRouter);

/***** Global route not found *****/
router.use(/.*/, (_, res: Response) => {
	ApiResponse.error(res, "Route not found", StatusCodes.NOT_FOUND, "");
});

export default router;
