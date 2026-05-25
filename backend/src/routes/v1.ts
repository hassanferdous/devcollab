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

const router = express.Router();

/***** Welcome route *****/
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

/***** Health check route *****/
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

/***** Global route not found *****/
router.use(/.*/, (_, res: Response) => {
	ApiResponse.error(res, "Route not found", StatusCodes.NOT_FOUND, "");
});

export default router;
