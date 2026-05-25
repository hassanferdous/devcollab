import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { envVar } from "./env.schema";

export const db_config = {
	db_uri: `postgresql://${envVar.POSTGRES_USER}:${envVar.POSTGRES_PASSWORD}@postgresql:${envVar.POSTGRES_PORT}/${envVar.POSTGRES_DB}`
};
const db = drizzle(db_config.db_uri);

export default db;
