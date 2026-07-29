import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import config from "../config/index";

const options: swaggerJSDoc.Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "DevCollab API Documentation",
			version: "1.0.0",
			description: "API documentation for the DevCollab application"
		},
		servers: [
			{
				url: `http://localhost:${config.env.APP_PORT}`,
				description: "Local development server"
			}
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description: "Enter your JWT access token"
				},
				cookieAuth: {
					type: "apiKey",
					in: "cookie",
					name: "access_token",
					description: "JWT access token stored in httpOnly cookie"
				}
			}
		}
	},
	apis: ["./src/routes/**/*.ts", "./src/domains/**/*.ts"]
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
	app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
