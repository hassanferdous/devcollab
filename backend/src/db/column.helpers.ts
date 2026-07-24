import { timestamp } from "drizzle-orm/pg-core";

export const timestamps = {
	updated_at: timestamp()
		.notNull()
		.$onUpdateFn(() => new Date()),
	created_at: timestamp().defaultNow().notNull(),
	deleted_at: timestamp()
};
