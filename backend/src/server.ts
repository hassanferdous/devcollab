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
import cookieParser from "cookie-parser";
import express from "express";
import morgan from "morgan";
import passport from "passport";
import { useSocket } from "./config/io";

const app = express();

/**
 * Register Socket
 */
const { server, io } = useSocket(app);
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
app.use("/api/v1", v1Router);

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
