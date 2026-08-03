ALTER TABLE "tasks" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_tasks_project_id_status_position" ON "tasks" USING btree ("project_id","status","position");--> statement-breakpoint
-- Backfill: seed each column's position from the existing created_at DESC order
-- (newest first) so the board looks identical to before until tasks are dragged.
UPDATE "tasks" AS t SET "position" = sub.rn - 1
FROM (
	SELECT "id", row_number() OVER (
		PARTITION BY "project_id", "status" ORDER BY "created_at" DESC, "id" DESC
	) AS rn
	FROM "tasks"
) AS sub
WHERE t."id" = sub."id";