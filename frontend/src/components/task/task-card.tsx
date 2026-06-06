import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { VariantProps } from "class-variance-authority";
import { format, isPast } from "date-fns";
import { Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import type { ProjectMember, Task, TaskPriority } from "~/types";
import { Badge, badgeVariants } from "../ui/badge";
import { useProjectContext } from "../providers/project-slug-provider";
import { useAbility } from "@casl/react";

const priorityConfig: Record<
	string,
	{ label: string; badgeClass: string; accentClass: string }
> = {
	low: {
		label: "Low",
		badgeClass:
			"bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
		accentClass: "border-l-slate-300 dark:border-l-slate-600",
	},
	medium: {
		label: "Medium",
		badgeClass:
			"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
		accentClass: "border-l-amber-400",
	},
	high: {
		label: "High",
		badgeClass:
			"bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
		accentClass: "border-l-orange-500",
	},
	urgent: {
		label: "Urgent",
		badgeClass:
			"bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
		accentClass: "border-l-red-500",
	},
};

const statusMap: Record<TaskPriority, string> = {
	low: "warning",
	medium: "info",
	high: "accent",
	urgent: "destructive",
};

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

interface TaskCardProps {
	task: Task;
	onOpen: () => void;
}

export function TaskCard({ task, onOpen }: TaskCardProps) {
	const { members, effectiveRole } = useProjectContext();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 999 : undefined,
	};

	const can = useAbility();
	const canEdit = can.can("update", { role: effectiveRole, subject: "Task" });

	const priority = priorityConfig[task.priority] ?? priorityConfig.low;
	const assignee = members?.find((m) => m.user_id === task.created_by);
	const isOverdue =
		task.due_date &&
		isPast(new Date(task.due_date)) &&
		task.status !== "completed";

	return (
		<div
			ref={setNodeRef}
			style={style}
			onClick={onOpen}
			className={cn(
				"group select-none rounded-lg bg-popover border-l-[3px] px-3 py-2.5",
				"shadow-sm transition-all duration-150",
				"cursor-pointer",
				canEdit && "active:cursor-grabbing",
				priority.accentClass,
				isDragging
					? "opacity-40 shadow-xl ring-2 ring-primary/40"
					: "hover:shadow-md hover:-translate-y-px",
			)}
			{...(canEdit ? { ...attributes, ...listeners } : {})}>
			{/* Title */}
			<p className="text-sm font-medium leading-snug text-foreground break-words">
				{task.title}
			</p>

			{/* Description */}
			{task.description && (
				<p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
					{task.description}
				</p>
			)}

			{/* Footer */}
			<div className="mt-2.5 flex items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-1.5">
					<Badge
						className="text-[10px]"
						variant={
							statusMap[task.priority] as keyof VariantProps<
								typeof badgeVariants
							>["variant"]
						}>
						{task.priority}
					</Badge>

					{task.due_date && (
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none",
								isOverdue
									? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
									: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
							)}>
							<Calendar className="size-2.5" />
							{format(new Date(task.due_date), "MMM d")}
						</span>
					)}
				</div>

				{assignee && (
					<Avatar className="size-5 shrink-0 ring-1 ring-border">
						<AvatarImage src={undefined} />
						<AvatarFallback className="text-[8px] bg-primary/10 text-primary font-medium">
							{getInitials(assignee.name)}
						</AvatarFallback>
					</Avatar>
				)}
			</div>
		</div>
	);
}
