import validate from "@/middlewares/validator";
import express from "express";
import passport from "passport";
import { AuthServices } from "./service";
import {
	forgotPasswordSchema,
	loginSchema,
	refreshTokensSchema,
	registerSchema,
	resetPasswordSchema,
	verifyOTPSchema
} from "./validation";
import auth from "@/middlewares/auth";

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticates a user using email and password, setting access and refresh tokens in HttpOnly cookies, and returning user data with the access token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *     responses:
 *       200:
 *         description: Successfully logged in
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
 *                   example: User logged in successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         avatar:
 *                           type: string
 *                           nullable: true
 *                           example: null
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         access_token:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid email or password
 */
router.post(
	"/login",
	validate({ body: loginSchema }),
	AuthServices.callback_credential
);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with a name, email, and password.
 *     tags: [Auth]
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
 *                 minLength: 3
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Invalid request data
 */
router.post(
	"/register",
	validate({ body: registerSchema }),
	AuthServices.register
);

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Login with Google OAuth
 *     description: Redirects the client to Google's authentication page.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 */
router.get(
	"/google",
	passport.authenticate("google", {
		scope: ["profile", "email"],
		session: false
	})
);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google login callback
 *     description: Callback endpoint for Google OAuth authentication. Redirects to frontend on completion.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to home page or login screen with error parameters
 */
router.get("/google/callback", AuthServices.callback_google);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logs out the authenticated user by invalidating the refresh token in Redis and clearing client-side cookies.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
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
 *                   example: User logged out successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 */
router.post("/logout", AuthServices.logout);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Generates a new access token using a refresh token supplied in the body or cookies.
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
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
 *                   example: Refresh token generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         access_token:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Refresh token invalid or expired
 */
router.post(
	"/refresh-token",
	validate({ body: refreshTokensSchema }),
	AuthServices.refreshTokens
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Forgot password request
 *     description: Requests a password reset OTP for the given email address.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset request processed
 */
router.post(
	"/forgot-password",
	// otpLimiter,
	validate({ body: forgotPasswordSchema }),
	AuthServices.forgotPassword
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get authenticated user
 *     description: Retrieves the details of the authenticated user.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                   example: User details retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 */
router.get("/me", auth, AuthServices.getMe);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify OTP
 *     description: Verifies the email reset password OTP.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post(
	"/verify-otp",
	// otpLimiter,
	validate({ body: verifyOTPSchema }),
	AuthServices.verifyOTPHandler
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Resets the password using a valid token and the new password.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - token
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: newpassword123
 *               token:
 *                 type: string
 *                 example: reset-token-uuid
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post(
	"/reset-password",
	// otpLimiter,
	validate({ body: resetPasswordSchema }),
	AuthServices.resetPassword
);

export default router;
