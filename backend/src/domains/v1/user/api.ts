import auth from "@/middlewares/auth";
import validate from "@/middlewares/validator";
import { throwError } from "@/utils/error";
import { ApiResponse } from "@/utils/response";
import { paginationSchema } from "@/validator/pagination";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { UserServices } from "./service";
import { createUserSchema } from "./validation";
import { getOrSet } from "@/utils/cache";
import redisClient from "@/services/redis";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           nullable: true
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: null
 *         provider:
 *           type: string
 *           example: credential
 *         isActive:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user record
 *     description: Registers a new user with the given details (Public).
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       201:
 *         description: Successfully created new user
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
 *                   example: Successfully created new user!
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.post(
	"/",
	validate({ body: createUserSchema }),
	async (req: Request, res: Response) => {
		const data = await UserServices.create({
			...req.body,
			password_hash: req.body.password
		});
		ApiResponse.success(
			res,
			"Successfully created new user!",
			data,
			StatusCodes.CREATED
		);
	}
);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Retrieve all user records
 *     description: Returns a list of all users. Requires authentication.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched all users
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
 *                   example: Successfully fetched all user!
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get(
	"/",
	auth,
	validate({ query: paginationSchema }),
	async (req: Request, res: Response) => {
		const { search, page, limit } = req.query as {
			search?: string;
			page?: string;
			limit?: string;
		};
		const data = await UserServices.getAll({
			search,
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined
		});
		ApiResponse.success(
			res,
			"Successfully fetched all user!",
			data,
			StatusCodes.OK
		);
	}
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Retrieve a single user record by ID
 *     description: Returns the user detail for a specific ID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user
 *     responses:
 *       200:
 *         description: Successfully fetched user
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
 *                   example: Successfully fetched user!
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get("/:id", async (req: Request, res: Response) => {
	const id = +req.params.id;
	const data = await getOrSet(`user:${id}`, 300, async () => {
		return await UserServices.getById(id);
	});
	if (!data) return throwError("User not found", StatusCodes.NOT_FOUND);
	ApiResponse.success(res, "Successfully fetched user!", data, StatusCodes.OK);
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update an existing user record by ID
 *     description: Updates fields of an existing user by ID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       202:
 *         description: Successfully updated user
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
 *                   example: Successfully updated user!
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.put("/:id", async (req: Request, res: Response) => {
	const id = +req.params.id;
	await UserServices.update(id, req.body);
	const data = await UserServices.getById(id);
	await redisClient.del(`user:${id}`);
	ApiResponse.success(
		res,
		"Successfully updated user!",
		data,
		StatusCodes.ACCEPTED
	);
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     description: Deletes a specific user by ID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user
 *     responses:
 *       204:
 *         description: Successfully deleted user
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const id = +req.params.id;
	const data = await UserServices.delete(id);
	await redisClient.del(`user:${id}`);
	ApiResponse.success(
		res,
		"Successfully deleted user!",
		data,
		StatusCodes.NO_CONTENT
	);
});

export default router;
