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

const columnConfig: Record<TaskStatus, { title: string; dot: string }> = {
	pending: {
		title: "To Do",
		dot: "bg-slate-400",
	},
	in_progress: {
		title: "In Progress",
		dot: "bg-blue-500",
	},
	completed: {
		title: "Completed",
		dot: "bg-emerald-500",
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
				"flex w-[272px] shrink-0 flex-col rounded-xl transition-all duration-150",
				"bg-[#f1f2f4] dark:bg-[#1d2125]",
				isOver && "ring-2 ring-primary/50 ring-offset-1",
			)}>
			{/* Column header */}
			<div className="flex items-center justify-between px-3 pt-3 pb-2">
				<div className="flex items-center gap-2 min-w-0">
					<span
						className={cn("size-2 rounded-full shrink-0", config.dot)}
					/>
					<h3 className="text-sm font-semibold text-foreground truncate">
						{config.title}
					</h3>
					<span className="rounded-md bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-xs font-medium text-foreground/60 leading-none">
						{tasks.length}
					</span>
				</div>
				{canEdit && (
					<Dialog open={createOpen} onOpenChange={setCreateOpen}>
						<DialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon-xs"
								className="text-foreground/50 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground rounded-md">
								<Plus className="size-4" />
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
				className="flex-1 overflow-y-auto px-2 py-1"
				style={{ maxHeight: "calc(100vh - 312px)" }}>
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
							<div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-black/10 dark:border-white/10">
								<p className="text-xs text-foreground/40">
									{canEdit ? "Drop tasks here" : "No tasks"}
								</p>
							</div>
						)}
					</div>
				</SortableContext>
			</div>

			{/* Add a card button */}
			{canEdit && (
				<div className="px-2 py-2">
					<Button
						variant="ghost"
						onClick={() => setCreateOpen(true)}
						className="w-full justify-start gap-2 rounded-lg text-foreground/60 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground h-8 px-2 text-sm font-normal">
						<Plus className="size-4 shrink-0" />
						Add a card
					</Button>
				</div>
			)}
		</div>
	);
}
