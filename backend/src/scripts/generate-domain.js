/* eslint-disable no-console */
/* eslint-disable no-undef */
import fs from "fs";
import path from "path";

const collectionName = process.argv[2];

if (!collectionName) {
	console.error("❌ Please provide an collection name.");
	process.exit(1);
}

const capitalized =
	collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
const baseDir = `src/domains/v1/${collectionName}`;
const schemaFile = `src/db/${collectionName}.schema.ts`;

if (fs.existsSync(baseDir)) {
	console.error(`❌ Directory already exists: ${baseDir}`);
	process.exit(1);
}

fs.mkdirSync(baseDir, { recursive: true });

// --- api.ts ---
fs.writeFileSync(
	path.join(baseDir, `api.ts`),
	`import { ApiResponse } from "@/utils/response";
import type { Request, Response } from "express";
import express from "express";
import { StatusCodes } from "http-status-codes";
import { ${capitalized}Services } from "./service";

const router = express.Router();

/**
 * @swagger
 * /api/v1/${collectionName}:
 *   post:
 *     summary: Create a new ${collectionName} record
 *     tags: [${capitalized}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Successfully created new ${collectionName}
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Successfully created new ${collectionName}!
 *                 data:
 *                   type: object
 */
router.post("/", async (req: Request, res: Response) => {
   const data = await ${capitalized}Services.create(req.body);
   ApiResponse.success(res, "Successfully created new ${collectionName}!", data, StatusCodes.CREATED);
});

/**
 * @swagger
 * /api/v1/${collectionName}:
 *   get:
 *     summary: Retrieve all ${collectionName} records
 *     tags: [${capitalized}]
 *     responses:
 *       200:
 *         description: Successfully fetched all ${collectionName}
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully fetched all ${collectionName}!
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/", async (_, res: Response) => {
   const data = await ${capitalized}Services.getAll();
   ApiResponse.success(res, "Successfully fetched all ${collectionName}!", data, StatusCodes.OK);
});

/**
 * @swagger
 * /api/v1/${collectionName}/{id}:
 *   get:
 *     summary: Retrieve a single ${collectionName} record by ID
 *     tags: [${capitalized}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the resource
 *     responses:
 *       200:
 *         description: Successfully fetched ${collectionName}
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully fetched ${collectionName}!
 *                 data:
 *                   type: object
 */
router.get("/:id", async (req: Request, res: Response) => {
   const id = +req.params.id;
   const data = await ${capitalized}Services.getById(id);
   ApiResponse.success(res, "Successfully fetched ${collectionName}!", data, StatusCodes.OK);
});

/**
 * @swagger
 * /api/v1/${collectionName}/{id}:
 *   put:
 *     summary: Update an existing ${collectionName} record by ID
 *     tags: [${capitalized}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the resource
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       202:
 *         description: Successfully updated ${collectionName}
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 202
 *                 message:
 *                   type: string
 *                   example: Successfully updated ${collectionName}!
 *                 data:
 *                   type: object
 */
router.put("/:id", async (req: Request, res: Response) => {
   const id = +req.params.id;
   await ${capitalized}Services.update(id, req.body);
   const data = await ${capitalized}Services.getById(id);
   ApiResponse.success(res, "Successfully updated ${collectionName}!", data, StatusCodes.ACCEPTED);
});

/**
 * @swagger
 * /api/v1/${collectionName}/{id}:
 *   delete:
 *     summary: Delete a specific ${collectionName} record by ID
 *     tags: [${capitalized}]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the resource
 *     responses:
 *       204:
 *         description: Successfully deleted ${collectionName}
 */
router.delete("/:id", async (req: Request, res: Response) => {
   const id = +req.params.id;
   const data = await ${capitalized}Services.delete(id);
   ApiResponse.success(res, "Successfully deleted ${collectionName}!", data, StatusCodes.NO_CONTENT);
});

export default router;
`
);

// --- service.ts ---
fs.writeFileSync(
	path.join(baseDir, `service.ts`),
	`import db from "@/config/db";
import { ${collectionName}sTable } from "@/db/${collectionName}.schema";
import { eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

export type ${capitalized} = InferSelectModel<typeof ${collectionName}sTable>;
export type New${capitalized} = InferInsertModel<typeof ${collectionName}sTable>;

export const ${capitalized}Services = {
   /**
    * Persists a new ${collectionName} record to the database
    * 
    * @param   {New${capitalized}} data - The payload required to build a new entry
    * @returns {Promise<${capitalized}>} The newly instantiated database record
    */
   create: async (data: New${capitalized}): Promise<${capitalized}> => {
      const [created] = await db.insert(${collectionName}sTable).values(data).returning();
      return created;
   },

   /**
    * Resolves a single ${collectionName} entry by its primary identity key
    * 
    * @param   {number} id - The primary identifier key
    * @returns {Promise<${capitalized} | null>} The record if located, otherwise null
    */
   getById: async (id: number): Promise<${capitalized} | null> => {
      const result = await db
         .select()
         .from(${collectionName}sTable)
         .where(eq(${collectionName}sTable.id, id));
      return result[0] ?? null;
   },

   /**
    * Queries and aggregates all records from the ${collectionName} table
    * 
    * @returns {Promise<${capitalized}[]>} An array of all compiled records
    */
   getAll: async (): Promise<${capitalized}[]> => {
      return db.select().from(${collectionName}sTable);
   },

   /**
    * Performs a patch update on specific targeted fields for an individual record
    * 
    * @param   {number} id - The target primary identifier key
    * @param   {Partial<New${capitalized}>} data - Subset of attributes to be overwritten
    * @returns {Promise<${capitalized} | null>} The updated record snapshot, or null if target absent
    */
   update: async (id: number, data: Partial<New${capitalized}>): Promise<${capitalized} | null> => {
      const [updated] = await db
         .update(${collectionName}sTable)
         .set(data)
         .where(eq(${collectionName}sTable.id, id))
         .returning();
      return updated ?? null;
   },

   /**
    * Hard deletes a single entry execution loop out of the target collection table
    * 
    * @param   {number} id - The primary identification key target to excise
    * @returns {Promise<${capitalized} | null>} The residual copy of the expunged record, or null
    */
   delete: async (id: number): Promise<${capitalized} | null> => {
      const [deleted] = await db
         .delete(${collectionName}sTable)
         .where(eq(${collectionName}sTable.id, id))
         .returning();
      return deleted ?? null;
   },
};
`
);

// --- schema.ts (In src/db) ---
if (!fs.existsSync(schemaFile)) {
	fs.writeFileSync(
		schemaFile,
		`import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const ${collectionName}sTable = pgTable("${collectionName}s", {
   id: integer().primaryKey().generatedAlwaysAsIdentity(),
   name: varchar({ length: 255 }).notNull(),
});
`
	);
}

// --- validation.ts ---
fs.writeFileSync(
	path.join(baseDir, `validation.ts`),
	`import { z } from "zod";

export const create${capitalized}Schema = z.object({
   name: z.string().min(1, "Name is required").max(255),
});

export const update${capitalized}Schema = create${capitalized}Schema.partial();
`
);

console.log(
	`✅ ${capitalized} domain generated in /src/domains/v1/${collectionName}`
);
console.log(
	`✅ ${capitalized} schema generated in /src/db/${collectionName}.schema.ts`
);
