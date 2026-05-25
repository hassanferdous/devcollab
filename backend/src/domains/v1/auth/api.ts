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

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email and password
 * @access  Public
 * @param   {Object} req.body - Email and password
 * @param   {string} req.body.email - Email
 * @param   {string} req.body.password - Password
 * @returns {Promise<User>} User record
 */
router.post(
	"/login",
	validate({ body: loginSchema }),
	AuthServices.callback_credential
);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 * @param   {Object} req.body - User details
 * @param   {string} req.body.name - User name
 * @param   {string} req.body.email - User email
 * @param   {string} req.body.password - User password
 * @returns {Promise<User>} User record
 */
router.post(
	"/register",
	validate({ body: registerSchema }),
	AuthServices.register
);

/**
 * @route   GET /api/v1/auth/google
 * @desc    Login with Google
 * @access  Public
 * @param   {Array<string>} scope - Array of scopes
 * @returns {Promise<User>} User record
 */
router.get(
	"/google",
	passport.authenticate("google", {
		scope: ["profile", "email"],
		session: false
	})
);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Login with Google callback
 * @access  Public
 * @returns {Promise<User>} User record
 */
router.get("/google/callback", AuthServices.callback_google);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout
 * @access  Private
 * @returns {Promise<User>} User record
 */
router.post("/logout", AuthServices.logout);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh token
 * @access  Private
 * @param   {Object} req.body - Refresh token
 * @param   {string} req.body.refresh_token - Refresh token
 * @returns {Promise<User>} User record
 */
router.post(
	"/refresh-token",
	validate({ body: refreshTokensSchema }),
	AuthServices.refreshTokens
);

/**
 * @route   GET /api/v1/auth/exchange
 * @desc    Exchange token
 * @access  Private
 * @param   {Object} req.query - Token
 * @param   {string} req.query.token - Token
 * @returns {Promise<User>} User record
 */
// router.get(
// 	"/exchange",
// 	validate({ query: exchageSchema }),
// 	AuthServices.exchangeToken
// );

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Forgot password
 * @access  Private
 * @param   {Object} req.body - Forgot password
 * @param   {string} req.body.email - Email
 * @returns {Promise<User>} User record
 */
router.post(
	"/forgot-password",
	// otpLimiter,
	validate({ body: forgotPasswordSchema }),
	AuthServices.forgotPassword
);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP
 * @access  Private
 * @param   {Object} req.body - OTP
 * @param   {string} req.body.otp - OTP
 * @returns {Promise<User>} User record
 */
router.post(
	"/verify-otp",
	// otpLimiter,
	validate({ body: verifyOTPSchema }),
	AuthServices.verifyOTPHandler
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password
 * @access  Private
 * @param   {Object} req.body - Reset password
 * @param   {string} req.body.otp - OTP
 * @param   {string} req.body.password - Password
 * @returns {Promise<User>} User record
 */
router.post(
	"/reset-password",
	// otpLimiter,
	validate({ body: resetPasswordSchema }),
	AuthServices.resetPassword
);

export default router;
