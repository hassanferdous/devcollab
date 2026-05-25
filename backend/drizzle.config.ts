import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { db_config } from "./src/config/db";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db",
	dialect: "postgresql",
	dbCredentials: {
		url: db_config.db_uri
	}
});
