/* eslint-disable no-console */

import db from "@/config/db";
import { projectMembersTable, projectsTable } from "@/db/project.schema";
import {
	taskActivityLogTable,
	taskMembersTable,
	tasksTable
} from "@/db/task.schema";
import { usersTable } from "@/db/user.schema";
import dotenv from "dotenv";
import { reset, seed } from "drizzle-seed";

dotenv.config();

async function main() {
	console.log("🔄 Resetting database...");
	await reset(db, {
		usersTable,
		projectsTable,
		projectMembersTable,
		tasksTable,
		taskMembersTable,
		taskActivityLogTable
	});

	console.log("🌱 Inserting default users...");
	// 1. Manually insert your specific default users first
	const defaultUsers = await db
		.insert(usersTable)
		.values([
			{
				email: "admin@gmail.com",
				password_hash:
					"$2b$10$2o9EGTMjEs0nJLhkxxR61ueO.TyD0iiVK3plXM/tiwIrS6wcS9Pv2",
				name: "Ferdous Sohag"
			},
			{
				email: "member@gmail.com",
				password_hash:
					"$2b$10$2o9EGTMjEs0nJLhkxxR61ueO.TyD0iiVK3plXM/tiwIrS6wcS9Pv2",
				name: "Rahat"
			},
			{
				email: "viewer@gmail.com",
				password_hash:
					"$2b$10$2o9EGTMjEs0nJLhkxxR61ueO.TyD0iiVK3plXM/tiwIrS6wcS9Pv2",
				name: "Rahim"
			}
		])
		.returning();

	console.log(`✅ Inserted ${defaultUsers.length} default users.`);
	console.log("🎲 Generating additional seed data...");

	// 2. Use drizzle-seed to generate the remaining records around them
	await seed(db, {
		usersTable,
		projectsTable,
		projectMembersTable,
		tasksTable,
		taskMembersTable,
		taskActivityLogTable
	}).refine(() => ({
		usersTable: {
			count: 10
		},
		projectsTable: {
			count: 10
		},
		tasksTable: {
			count: 10
		},
		projectMembersTable: {
			count: 10
		},
		taskMembersTable: {
			count: 10
		},
		taskActivityLogTable: {
			count: 10
		}
	}));

	console.log("✨ Database successfully seeded!");
}

main().catch((err) => {
	console.error("❌ Seeding failed:", err);
	process.exit(1);
});
