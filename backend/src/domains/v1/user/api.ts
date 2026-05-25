import auth from "@/middlewares/auth";
import validate from "@/middlewares/validator";
import { throwError } from "@/utils/error";
import { ApiResponse } from "@/utils/response";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { UserServices } from "./service";
import { createUserSchema } from "./validation";

const router = express.Router();

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user record
 * @access  Public
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
 * @route   GET /api/v1/users
 * @desc    Retrieve all user records for the authenticated user
 * @access  Private
 * @returns {Promise<User[]>} Array of user records
 */
router.get("/", auth, async (_, res: Response) => {
	const data = await UserServices.getAll();
	ApiResponse.success(
		res,
		"Successfully fetched all user!",
		data,
		StatusCodes.OK
	);
});

/**
 * @route   GET /api/v1/users/:id
 * @desc    Retrieve a single user record by ID
 * @access  Private
 * @param   {number} id - Unique identifier of the user
 * @returns {Promise<User>} User record
 */
router.get("/:id", async (req: Request, res: Response) => {
	const id = +req.params.id;
	const data = await UserServices.getById(id);
	if (!data) return throwError("User not found", StatusCodes.NOT_FOUND);
	ApiResponse.success(res, "Successfully fetched user!", data, StatusCodes.OK);
});

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update an existing user record by ID
 * @access  Private
 * @param   {number} id - Unique identifier of the user
 * @returns {Promise<User>} Updated user
 */
router.put("/:id", async (req: Request, res: Response) => {
	const id = +req.params.id;
	await UserServices.update(id, req.body);
	const data = await UserServices.getById(id);
	ApiResponse.success(
		res,
		"Successfully updated user!",
		data,
		StatusCodes.ACCEPTED
	);
});

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete a user by ID
 * @access  Private
 * @param   {number} id - Unique identifier of the user
 * @returns {Promise<NoContent>} Deleted user
 */
router.delete("/:id", async (req: Request, res: Response) => {
	const id = +req.params.id;
	const data = await UserServices.delete(id);
	ApiResponse.success(
		res,
		"Successfully deleted user!",
		data,
		StatusCodes.NO_CONTENT
	);
});

export default router;
