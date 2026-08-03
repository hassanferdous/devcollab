import type { TaskActivity } from "~/types";

const STATUS_LABELS: Record<string, string> = {
	pending: "Pending",
	in_progress: "In Progress",
	completed: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	urgent: "Urgent",
};

// Fields worth surfacing in the activity feed.
const TRACKED = [
	"title",
	"status",
	"priority",
	"description",
	"start_date",
	"due_date",
] as const;

/**
 * Turn an activity-log row into a human, Trello-style label
 * (e.g. "added this card", "changed status to Done", "renamed this card").
 */
export function describeActivity(item: TaskActivity): string {
	if (item.action === "created") return "added this card";
	if (item.action === "deleted") return "archived this card";

	// updated → diff old vs new over the tracked fields.
	const oldV = item.old_values ?? {};
	const newV = item.new_values ?? {};
	const changed = TRACKED.filter(
		(k) =>
			newV[k] !== undefined &&
			JSON.stringify(oldV[k] ?? null) !== JSON.stringify(newV[k] ?? null),
	);

	if (changed.length !== 1) return "updated this card";

	const field = changed[0];
	const val = newV[field];
	switch (field) {
		case "status":
			return `changed status to ${STATUS_LABELS[String(val)] ?? val}`;
		case "priority":
			return `set priority to ${PRIORITY_LABELS[String(val)] ?? val}`;
		case "title":
			return "renamed this card";
		case "description":
			return val ? "updated the description" : "removed the description";
		case "start_date":
			return val ? "set the start date" : "cleared the start date";
		case "due_date":
			return val ? "set the due date" : "cleared the due date";
		default:
			return "updated this card";
	}
}
