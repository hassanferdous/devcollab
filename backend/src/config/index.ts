/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { envVar } from "./env.schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = envVar.NODE_ENV;

const jsonConfigSchema = z.object({
	app: z.object({
		name: z.string().default("DevCollb Backend"),
		apiPrefix: z.string().default("/api/v1")
	}),
	cors: z.object({
		origin: z.array(z.string()).default(["*"]),
		methods: z
			.array(z.string())
			.default(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
	}),
	logging: z.object({
		level: z
			.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
			.default("info")
	})
});

type JsonConfig = z.infer<typeof jsonConfigSchema>;

const getConfig = (): JsonConfig => {
	const configPath = path.resolve(__dirname, `config.${mode}.json`);

	if (!fs.existsSync(configPath)) {
		console.warn(
			`⚠️ Configuration file not found at ${configPath}, using defaults.`
		);
		return jsonConfigSchema.parse({}); // Returns defaults defined in schema
	}

	try {
		const fileContent = fs.readFileSync(configPath, "utf-8");
		const parsed = JSON.parse(fileContent);

		const result = jsonConfigSchema.safeParse(parsed);
		if (!result.success) {
			console.error(
				`❌ Invalid configuration in ${configPath}:`,
				result.error.format()
			);
			return jsonConfigSchema.parse({}); // Fallback to defaults
		}

		return result.data;
	} catch (error) {
		console.error(
			`❌ Error reading configuration file at ${configPath}:`,
			error
		);
		return jsonConfigSchema.parse({});
	}
};

const jsonConfig = getConfig();

export const config = {
	...jsonConfig,
	env: envVar,
	isDevelopment: mode === "development",
	isProduction: mode === "production",
	isTest: mode === "test"
} as const;

export type Config = typeof config;
export default config;
