import { format } from "date-fns";
import { AlignLeft, Calendar, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type {
	ProjectMember,
	Task,
	TaskPriority,
	TaskStatus,
	UpdateTaskFormData,
} from "~/types";

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const statusConfig: Record<
	TaskStatus,
	{ label: string; active: string; idle: string }
> = {
	pending: {
		label: "To Do",
		active:
			"bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
		idle: "text-muted-foreground hover:bg-muted",
	},
	in_progress: {
		label: "In Progress",
		active:
			"bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
		idle: "text-muted-foreground hover:bg-muted",
	},
	completed: {
		label: "Done",
		active:
			"bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
		idle: "text-muted-foreground hover:bg-muted",
	},
};

const priorityConfig: Record<TaskPriority, { label: string; dot: string }> = {
	low: { label: "Low", dot: "bg-slate-400" },
	medium: { label: "Medium", dot: "bg-yellow-400" },
	high: { label: "High", dot: "bg-orange-400" },
	urgent: { label: "Urgent", dot: "bg-red-500" },
};

interface TaskDetailProps {
	task: Task;
	members: ProjectMember[];
	canEdit: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (taskId: number, data: UpdateTaskFormData) => void;
	onDelete: (taskId: number) => void;
	isUpdating: boolean;
}

export function TaskDetail({
	task,
	members,
	canEdit,
	open,
	onOpenChange,
	onUpdate,
	onDelete,
	isUpdating,
}: TaskDetailProps) {
	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description ?? "");
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		setTitle(task.title);
		setDescription(task.description ?? "");
		setConfirmDelete(false);
	}, [task.id]);

	const saveTitle = () => {
		const trimmed = title.trim();
		if (!trimmed) {
			setTitle(task.title);
			return;
		}
		if (trimmed !== task.title) onUpdate(task.id, { title: trimmed });
	};

	const saveDescription = () => {
		if (description !== (task.description ?? "")) {
			onUpdate(task.id, { description });
		}
	};

	const handleDelete = () => {
		onDelete(task.id);
		onOpenChange(false);
	};

	const creator = members.find((m) => m.user_id === task.created_by);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden flex flex-col">
				<DialogTitle className="sr-only">{task.title}</DialogTitle>

				{/* Close button */}
				<button
					onClick={() => onOpenChange(false)}
					className="absolute top-3 right-3 z-10 rounded-md p-1 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-muted transition-all">
					<X className="size-4" />
					<span className="sr-only">Close</span>
				</button>

				{/* Header */}
				<div className="px-6 pt-5 pb-4 pr-10 shrink-0">
					{canEdit ? (
						<input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onBlur={saveTitle}
							onKeyDown={(e) =>
								e.key === "Enter" && e.currentTarget.blur()
							}
							placeholder="Task title"
							className="w-full text-lg font-semibold bg-transparent border-0 outline-none rounded px-1 -mx-1 hover:bg-muted/40 focus:bg-muted/40 transition-colors"
						/>
					) : (
						<h2 className="text-lg font-semibold">{task.title}</h2>
					)}
					<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
						<span>
							in{" "}
							<span className="font-medium text-foreground">
								{statusConfig[task.status].label}
							</span>
						</span>
						{creator?.user && (
							<>
								<span>·</span>
								<span>by {creator.user.name}</span>
							</>
						)}
						<span>·</span>
						<span className="flex items-center gap-1">
							<Calendar className="size-3" />
							{format(new Date(task.created_at), "MMM d, yyyy")}
						</span>
					</div>
				</div>

				<Separator />

				{/* Body */}
				<div className="flex max-md:flex-col flex-1 overflow-hidden">
					{/* Main column */}
					<div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-w-0">
						<div>
							<div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
								<AlignLeft className="size-3.5" />
								Description
							</div>
							{canEdit ? (
								<Textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									onBlur={saveDescription}
									placeholder="Add a more detailed description..."
									className="resize-none text-sm min-h-[120px]"
									rows={5}
								/>
							) : (
								<p className="text-sm text-muted-foreground whitespace-pre-wrap">
									{task.description || "No description."}
								</p>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className="md:basis-[35%] md:shrink-0 border-l border-border overflow-y-auto px-3.5 py-4 space-y-5">
						{/* Status */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
								Status
							</p>
							<div className="flex flex-col gap-0.5">
								{(Object.keys(statusConfig) as TaskStatus[]).map(
									(s) => (
										<button
											key={s}
											disabled={!canEdit || isUpdating}
											onClick={() => {
												if (canEdit && task.status !== s)
													onUpdate(task.id, { status: s });
											}}
											className={cn(
												"w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors disabled:cursor-default",
												task.status === s
													? statusConfig[s].active
													: statusConfig[s].idle,
											)}>
											{statusConfig[s].label}
										</button>
									),
								)}
							</div>
						</div>

						{/* Priority */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
								Priority
							</p>
							<Select
								value={task.priority}
								onValueChange={(val) => {
									if (canEdit)
										onUpdate(task.id, {
											priority: val as TaskPriority,
										});
								}}
								disabled={!canEdit || isUpdating}>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue>
										<span className="flex items-center gap-1.5">
											<span
												className={cn(
													"size-2 rounded-full",
													priorityConfig[task.priority]?.dot,
												)}
											/>
											{priorityConfig[task.priority]?.label}
										</span>
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{(Object.keys(priorityConfig) as TaskPriority[]).map(
										(p) => (
											<SelectItem key={p} value={p}>
												<span className="flex items-center gap-1.5">
													<span
														className={cn(
															"size-2 rounded-full",
															priorityConfig[p].dot,
														)}
													/>
													{priorityConfig[p].label}
												</span>
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>

						{/* Due date */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
								Due Date
							</p>
							<input
								type="date"
								disabled={!canEdit || isUpdating}
								value={task.due_date?.slice(0, 10) ?? ""}
								onChange={(e) => {
									if (canEdit)
										onUpdate(task.id, {
											due_date: e.target.value || undefined,
										});
								}}
								className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-shadow"
							/>
						</div>

						{/* Start date */}
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
								Start Date
							</p>
							<input
								type="date"
								disabled={!canEdit || isUpdating}
								value={task.start_date?.slice(0, 10) ?? ""}
								onChange={(e) => {
									if (canEdit)
										onUpdate(task.id, {
											start_date: e.target.value || undefined,
										});
								}}
								className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-shadow"
							/>
						</div>

						{/* Members */}
						{members.length > 0 && (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
									Members
								</p>
								<div className="flex flex-wrap gap-1">
									{members.map(
										(m) =>
											m.user && (
												<div key={m.user_id} title={m.user.name}>
													<Avatar className="size-7 ring-2 ring-background">
														<AvatarImage
															src={m.user.avatar ?? undefined}
														/>
														<AvatarFallback className="text-[9px]">
															{getInitials(m.user.name)}
														</AvatarFallback>
													</Avatar>
												</div>
											),
									)}
								</div>
							</div>
						)}

						{/* Delete */}
						{canEdit && (
							<div>
								<Separator className="mb-3" />
								{confirmDelete ? (
									<div className="space-y-1.5">
										<p className="text-xs text-muted-foreground">
											Delete this task?
										</p>
										<Button
											size="sm"
											variant="destructive"
											className="w-full h-7 text-xs"
											onClick={handleDelete}>
											Yes, delete
										</Button>
										<Button
											size="sm"
											variant="outline"
											className="w-full h-7 text-xs"
											onClick={() => setConfirmDelete(false)}>
											Cancel
										</Button>
									</div>
								) : (
									<Button
										variant="ghost"
										size="sm"
										className="w-full justify-start text-muted-foreground hover:text-destructive h-7 text-xs px-2.5"
										onClick={() => setConfirmDelete(true)}>
										<Trash2 className="size-3.5 mr-1.5" />
										Delete task
									</Button>
								)}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
