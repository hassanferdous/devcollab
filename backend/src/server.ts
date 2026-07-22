/* eslint-disable no-console */
import db from "@/config/db";
import { config } from "@/config/index";
import "@/config/redis";
import "@/domains/v1/auth/passport";
import {
	entityParseHandler,
	errorHandler
} from "@/middlewares/global-error-handler";
import { default as v1Router } from "@/routes/v1";
import { setupSwagger } from "@/config/swagger";
import cookieParser from "cookie-parser";
import express from "express";
import morgan from "morgan";
import passport from "passport";
import { initSocketIO } from "./socket/io";
import cors from "cors";
import { apiLimiter } from "./middlewares/rate-limiter";

const app = express();

/**
 * Trust first proxy
 */
app.set("trust proxy", 1);

/**
 * Register CORS
 */
app.use(
	cors({
		origin: ["http://localhost:3000"],
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
	})
);

/**
 * Register Socket
 */
const { server, io } = initSocketIO(app);
app.set("io", io);
/*
 * Register Passport
 */
app.use(passport.initialize());

/**
 * Register request middlewares
 */
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	morgan(":method :url :status :res[content-length] - :response-time ms")
);

/**
 * Connect to Database
 */
async function connectDB(maxRetries: number = 5, delay: number = 1000) {
	try {
		await db.execute("SELECT 1");
		console.log("✅ Database connected successfully");
	} catch (error) {
		if (maxRetries === 0) {
			console.error("❌ Error connecting to database:", error);
			process.exit(1);
		}
		console.log(`❌ Retrying in ${delay}ms...`);
		await new Promise((resolve) => setTimeout(resolve, delay));
		await connectDB(maxRetries - 1, delay * 2);
	}
}

/**
 * Register API v1 Routes
 */
app.use(config.app.apiPrefix, apiLimiter, v1Router);

/**
 * Register Swagger API Documentation
 */
setupSwagger(app);

/**
 * Register global error handler and Entity parser handler
 */
app.use(entityParseHandler);
app.use(errorHandler);

/**
 * Start the server
 */
async function startServer() {
	await connectDB();
	server.listen(config.env.APP_PORT, () => {
		console.log(
			`🚀 Server running in ${config.env.NODE_ENV} mode on http://localhost:${config.env.APP_PORT}`
		);
	});
}

startServer();
