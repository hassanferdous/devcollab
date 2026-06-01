import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { TaskCard } from "./task-card";
import { TaskForm } from "./task-form";
import type { ProjectMember, Task, TaskStatus } from "~/types";
import { cn } from "~/lib/utils";

const columnConfig: Record<
	TaskStatus,
	{ title: string; color: string; headerColor: string; dot: string }
> = {
	pending: {
		title: "To Do",
		color: "bg-slate-50 dark:bg-slate-900/40",
		headerColor: "text-slate-700 dark:text-slate-300",
		dot: "bg-slate-400",
	},
	in_progress: {
		title: "In Progress",
		color: "bg-blue-50/60 dark:bg-blue-950/30",
		headerColor: "text-blue-700 dark:text-blue-400",
		dot: "bg-blue-400",
	},
	completed: {
		title: "Completed",
		color: "bg-green-50/60 dark:bg-green-950/20",
		headerColor: "text-green-700 dark:text-green-400",
		dot: "bg-green-400",
	},
};

interface KanbanColumnProps {
	status: TaskStatus;
	tasks: Task[];
	canEdit: boolean;
	members: ProjectMember[];
	onCreateTask: (data: { title: string; description: string }) => void;
	onOpenTask: (taskId: number) => void;
	isCreating: boolean;
}

export function KanbanColumn({
	status,
	tasks,
	canEdit,
	members,
	onCreateTask,
	onOpenTask,
	isCreating,
}: KanbanColumnProps) {
	const [createOpen, setCreateOpen] = useState(false);
	const config = columnConfig[status];

	const { setNodeRef, isOver } = useDroppable({ id: status });

	const handleCreateTask = (data: { title: string; description?: string }) => {
		onCreateTask({ title: data.title, description: data.description ?? "" });
		setCreateOpen(false);
	};

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex w-72 shrink-0 flex-col rounded-xl border transition-all duration-150",
				config.color,
				isOver
					? "ring-2 ring-primary/40 border-primary/30"
					: "border-border/60",
			)}>
			{/* Column header */}
			<div className="flex items-center justify-between px-3 pt-3 pb-2">
				<div className="flex items-center gap-2">
					<span className={cn("size-2 rounded-full", config.dot)} />
					<h3 className={cn("text-sm font-semibold", config.headerColor)}>
						{config.title}
					</h3>
					<span className="rounded-full bg-background/80 px-1.5 py-0.5 text-xs font-medium text-muted-foreground shadow-sm border border-border/40">
						{tasks.length}
					</span>
				</div>
				{canEdit && (
					<Dialog open={createOpen} onOpenChange={setCreateOpen}>
						<DialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon-xs"
								className="text-muted-foreground hover:text-foreground">
								<Plus className="size-3.5" />
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create task</DialogTitle>
							</DialogHeader>
							<TaskForm
								onSubmit={handleCreateTask}
								isPending={isCreating}
								onCancel={() => setCreateOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				)}
			</div>

			{/* Task list */}
			<div
				className="flex-1 overflow-y-auto px-3 pb-3 pt-1"
				style={{ maxHeight: "calc(100vh - 280px)" }}>
				<SortableContext
					items={tasks.map((t) => t.id)}
					strategy={verticalListSortingStrategy}>
					<div className="flex flex-col gap-2">
						{tasks.map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								canEdit={canEdit}
								members={members}
								onOpen={() => onOpenTask(task.id)}
							/>
						))}
						{tasks.length === 0 && (
							<div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/60">
								<p className="text-xs text-muted-foreground">
									{canEdit ? "Drop tasks here" : "No tasks"}
								</p>
							</div>
						)}
					</div>
				</SortableContext>
			</div>
		</div>
	);
}
