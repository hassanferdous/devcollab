/* eslint-disable no-console */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**** Load root .env first to get the default NODE_ENV *****/
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const mode = process.env.NODE_ENV ?? "development";

/**** Load the specific environment file (overrides root .env) *****/
dotenv.config({
	path: path.resolve(__dirname, "..", "..", `.env.${mode}`),
	override: true
});

export const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]),
	APP_PORT: z.coerce.number(),
	CLIENT_URL: z.string(),
	POSTGRES_PORT: z.coerce.number(),
	POSTGRES_USER: z.string(),
	POSTGRES_PASSWORD: z.string(),
	POSTGRES_DB: z.string(),
	JWT_ACCESS_SECRET: z.string().min(10),
	JWT_REFRESH_SECRET: z.string().min(10),
	JWT_ACCESS_EXPIRES_IN: z.string(),
	JWT_REFRESH_EXPIRES_IN: z.string(),
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	REDIS_PORT: z.coerce.number(),
	REDIS_HOST: z.string()
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
	console.error("❌ Invalid environment variables:", _env.error.format());
	process.exit(1);
}

export const envVar = _env.data;
export type Env = z.infer<typeof envSchema>;
