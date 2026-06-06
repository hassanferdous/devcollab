import { format } from "date-fns";
import {
	AlignLeft,
	CalendarClock,
	CalendarPlus,
	CheckSquare,
	ChevronDown,
	Circle,
	Flag,
	Image,
	MessageSquare,
	MoreHorizontal,
	Paperclip,
	Plus,
	Tag,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type {
	ProjectMember,
	Task,
	TaskPriority,
	TaskStatus,
	UpdateTaskFormData,
} from "~/types";
import { AddMemberDialog } from "../project/project-members";
import { useParams } from "@tanstack/react-router";
import { useProjectContext } from "../providers/project-slug-provider";
import { Can } from "@casl/react";

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const statusConfig: Record<TaskStatus, { label: string; badgeCls: string }> = {
	pending: {
		label: "Pending",
		badgeCls:
			"bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:hover:bg-yellow-900/60",
	},
	in_progress: {
		label: "In Progress",
		badgeCls:
			"bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60",
	},
	completed: {
		label: "Done",
		badgeCls:
			"bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60",
	},
};

const priorityConfig: Record<
	TaskPriority,
	{ label: string; dot: string; flag: string; pill: string }
> = {
	low: {
		label: "Low",
		dot: "bg-slate-400",
		flag: "text-slate-400",
		pill: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700",
	},
	medium: {
		label: "Medium",
		dot: "bg-yellow-400",
		flag: "text-yellow-500",
		pill: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800 dark:hover:bg-yellow-900/50",
	},
	high: {
		label: "High",
		dot: "bg-orange-400",
		flag: "text-orange-500",
		pill: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 dark:hover:bg-orange-900/50",
	},
	urgent: {
		label: "Urgent",
		dot: "bg-red-500",
		flag: "text-red-500",
		pill: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/50",
	},
};

interface TaskDetailProps {
	task: Task;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (taskId: number, data: UpdateTaskFormData) => void;
	onDelete: (taskId: number) => void;
	isUpdating: boolean;
}

export function TaskDetail({
	task,
	open,
	onOpenChange,
	onUpdate,
	onDelete,
	isUpdating,
}: TaskDetailProps) {
	const { effectiveRole, members } = useProjectContext();

	const { projectId } = useParams({ from: "/_app/projects/$projectId/" });
	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description ?? "");
	const [editingDescription, setEditingDescription] = useState(false);

	const [dateRange, setDateRange] = useState<DateRange | undefined>({
		from: undefined,
		to: undefined,
	});

	useEffect(() => {
		setTitle(task.title);
		setDescription(task.description ?? "");
		setEditingDescription(false);
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
		setEditingDescription(false);
	};

	const cancelDescription = () => {
		setDescription(task.description ?? "");
		setEditingDescription(false);
	};

	const creator = members?.find((m) => m.user_id === task.created_by);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-5xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
				<DialogTitle className="sr-only">{task.title}</DialogTitle>

				{/* Top bar */}
				<div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b border-border">
					<Can
						do="update"
						on={{ role: effectiveRole, subject: "Task" }}
						passThrough>
						{({ isAllowed }) => (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										disabled={!isAllowed || isUpdating}
										className={cn(
											"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-70",
											statusConfig[task.status].badgeCls,
										)}>
										{statusConfig[task.status].label}
										<ChevronDown className="size-3" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="start"
									className="min-w-[160px]">
									{(Object.keys(statusConfig) as TaskStatus[]).map(
										(s) => (
											<DropdownMenuItem
												key={s}
												className={cn(
													"cursor-pointer",
													task.status === s && "bg-accent",
												)}
												onClick={() => {
													if (task.status !== s)
														onUpdate(task.id, { status: s });
												}}>
												{statusConfig[s].label}
											</DropdownMenuItem>
										),
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</Can>

					<div className="flex items-center gap-0.5">
						<button className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
							<Image className="size-4" />
						</button>
						<Can
							do="update"
							on={{ role: effectiveRole, subject: "Task" }}>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
										<MoreHorizontal className="size-4" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
										onClick={() => {
											onDelete(task.id);
											onOpenChange(false);
										}}>
										<Trash2 className="size-3.5 mr-2" />
										Delete task
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</Can>

						<button
							onClick={() => onOpenChange(false)}
							className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
							<X className="size-4" />
						</button>
					</div>
				</div>

				{/* Two-column body */}
				<div className="flex flex-1 min-h-0 overflow-hidden max-md:flex-col">
					{/* Left – main content */}
					<div className="flex-1 min-w-0 overflow-y-auto px-5 py-4 space-y-4">
						{/* Title */}
						<div className="flex items-start gap-3">
							<Circle className="mt-1.5 size-5 text-muted-foreground shrink-0" />

							<Textarea
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onBlur={saveTitle}
								onKeyDown={(e) =>
									e.key === "Enter" && e.currentTarget.blur()
								}
								placeholder="Task title"
								disabled={isUpdating}
								className="w-full resize-none h-auto min-h-auto rounded p-0 border-none font-semibold text-xl! dark:bg-transparent"
							/>
						</div>

						{/* Action buttons */}
						<div className="flex flex-wrap gap-2 ml-8">
							{(
								[
									{ icon: Plus, label: "Add" },
									{ icon: Tag, label: "Labels" },
									{ icon: CheckSquare, label: "Checklist" },
									{ icon: Paperclip, label: "Attachment" },
								] as const
							).map(({ icon: Icon, label }) => (
								<Button key={label} variant="accent">
									<Icon className="size-3.5" />
									{label}
								</Button>
							))}

							{/* Start date pill */}
							<Can
								do="update"
								on={{ role: effectiveRole, subject: "Task" }}
								passThrough>
								{({ isAllowed }) => (
									<Popover>
										<PopoverTrigger asChild>
											<button
												disabled={!isAllowed || isUpdating}
												className={cn(
													"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-60",
													dateRange?.from
														? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/50"
														: "bg-accent text-accent-foreground border-border hover:bg-accent/80",
												)}>
												<CalendarPlus className="size-3.5 shrink-0" />
												<span>
													{dateRange?.from
														? format(dateRange.from, "MMM d")
														: "Start date"}
												</span>
												{dateRange?.from && (
													<span
														role="button"
														aria-label="Clear due date"
														tabIndex={0}
														onClick={(e) => {
															e.stopPropagation();
															setDateRange((prev) => ({
																...prev,
																from: undefined,
															}));
														}}
														className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity">
														<X className="size-2.5" />
													</span>
												)}
											</button>
										</PopoverTrigger>
										<PopoverTrigger asChild>
											<button
												disabled={!isAllowed || isUpdating}
												className={cn(
													"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-60",
													dateRange?.to
														? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/50"
														: "bg-accent text-accent-foreground border-border hover:bg-accent/80",
												)}>
												<CalendarClock className="size-3.5 shrink-0" />
												<span>
													{dateRange?.to
														? format(dateRange.to, "MMM d")
														: "Due date"}
												</span>
												{dateRange?.to && (
													<span
														role="button"
														aria-label="Clear due date"
														tabIndex={0}
														onClick={(e) => {
															e.stopPropagation();
															setDateRange((prev) => ({
																from: prev?.from,
																to: undefined,
															}));
														}}
														className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity">
														<X className="size-2.5" />
													</span>
												)}
											</button>
										</PopoverTrigger>
										<PopoverContent
											align="end"
											className="w-auto p-0 overflow-hidden">
											<Calendar
												selected={dateRange}
												captionLayout="label"
												classNames={{
													root: "w-full",
												}}
												mode="range"
												onSelect={setDateRange}
											/>
											<div className="flex items-center justify-end gap-2 px-3 py-1.5 border-t border-border bg-muted/30">
												<button
													type="button"
													onClick={() =>
														setDateRange({
															from: undefined,
															to: undefined,
														})
													}
													className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium px-2 py-1 rounded-md hover:bg-destructive/10">
													Clear
												</button>
												<PopoverClose asChild>
													<Button
														className="py-1 h-auto text-xs"
														disabled={!dateRange?.from}
														type="button">
														Save
													</Button>
												</PopoverClose>
											</div>
										</PopoverContent>
									</Popover>
								)}
							</Can>

							{/* Priority pill – DropdownMenu */}
							<Can
								do="update"
								on={{ role: effectiveRole, subject: "Task" }}
								passThrough>
								{({ isAllowed }) => (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												disabled={!isAllowed || isUpdating}
												className={cn(
													"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-60",
													priorityConfig[task.priority].pill,
												)}>
												<Flag
													className={cn(
														"size-3 shrink-0",
														priorityConfig[task.priority].flag,
													)}
												/>
												{priorityConfig[task.priority].label}
												<ChevronDown className="size-3 opacity-60" />
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="start"
											className="min-w-[160px]">
											<div className="px-2 py-1.5 mb-1">
												<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
													Set priority
												</p>
											</div>

											{(
												Object.keys(
													priorityConfig,
												) as TaskPriority[]
											).map((p) => (
												<Can
													do="update"
													on={{
														role: effectiveRole,
														subject: "Task",
													}}
													passThrough>
													{({ isAllowed }) => (
														<DropdownMenuItem
															key={p}
															className={cn(
																"cursor-pointer gap-2 rounded-md",
																task.priority === p &&
																	"bg-accent font-semibold",
															)}
															onClick={() => {
																if (
																	isAllowed &&
																	task.priority !== p
																)
																	onUpdate(task.id, {
																		priority: p,
																	});
															}}>
															<Flag
																className={cn(
																	"size-3.5 shrink-0",
																	priorityConfig[p].flag,
																)}
															/>
															<span>
																{priorityConfig[p].label}
															</span>
															{task.priority === p && (
																<span className="ml-auto text-[10px] font-medium bg-muted rounded px-1 py-0.5">
																	active
																</span>
															)}
														</DropdownMenuItem>
													)}
												</Can>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</Can>
						</div>

						{/* Members */}
						{members && members.length > 0 && (
							<div>
								<div className="flex items-center gap-2 mb-2">
									<Users className="size-4 text-muted-foreground shrink-0" />
									<span className="text-sm font-semibold text-muted-foreground">
										Members
									</span>
								</div>
								<div className="flex flex-wrap items-center ml-6">
									{members?.map((m) => (
										<div
											className="not-first:-ml-2"
											key={m.user_id}
											title={m.name}>
											<Avatar className="ring-2 ring-background inline-flex">
												<AvatarImage src={undefined} />
												<AvatarFallback className="text-[10px]">
													{getInitials(m.name)}
												</AvatarFallback>
											</Avatar>
										</div>
									))}
									<Can
										do="update"
										on={{ role: effectiveRole, subject: "Task" }}>
										<AddMemberDialog projectId={+projectId}>
											<Button
												className="size-8 rounded-full ml-1"
												variant="accent"
												size="icon"
												aria-haspopup>
												<Plus className="size-3.5" />
											</Button>
										</AddMemberDialog>
									</Can>
								</div>
							</div>
						)}

						{/* Description */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<AlignLeft className="size-4 text-muted-foreground shrink-0" />
									<span className="text-sm font-semibold text-muted-foreground">
										Description
									</span>
								</div>
								<Can
									do="update"
									on={{ role: effectiveRole, subject: "Task" }}>
									<button
										onClick={() => setEditingDescription(true)}
										className="rounded-md px-3 py-1 text-xs text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors">
										Edit
									</button>
								</Can>
							</div>
							<div className="ml-6">
								{editingDescription ? (
									<div className="space-y-2">
										<Textarea
											value={description}
											onChange={(e) =>
												setDescription(e.target.value)
											}
											autoFocus
											placeholder="Add a more detailed description..."
											rows={4}
											className="resize-none text-sm min-h-16"
										/>
										<div className="flex gap-2">
											<Button
												size="sm"
												onClick={saveDescription}
												className="h-7 text-xs">
												Save
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={cancelDescription}
												className="h-7 text-xs">
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<Can
										do="update"
										on={{ role: effectiveRole, subject: "Task" }}
										passThrough>
										{({ isAllowed }) => (
											<div
												onClick={() =>
													isAllowed && setEditingDescription(true)
												}
												className={cn(
													"text-sm whitespace-pre-wrap min-h-16 rounded-md px-3 py-2.5 transition-colors break-words",
													description
														? "text-foreground"
														: "text-muted-foreground italic",
													isAllowed &&
														"cursor-pointer hover:bg-muted",
												)}>
												{description ||
													"Add a more detailed description..."}
											</div>
										)}
									</Can>
								)}
							</div>
						</div>

						{/* Creator */}
						{creator?.name && (
							<p className="text-xs text-muted-foreground/60 ml-6">
								Created by {creator.name} ·{" "}
								{format(new Date(task.created_at), "MMM d, yyyy")}
							</p>
						)}
					</div>

					{/* Right – comments & activity */}
					<div className="max-md:border-t md:border-l border-border w-full md:w-[320px] md:shrink-0 overflow-y-auto px-4 py-4 flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
								<MessageSquare className="size-4" />
								Comments and activity
							</div>
							<button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
								Show details
							</button>
						</div>

						{/* Comment input placeholder */}
						<div className="rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-muted-foreground cursor-text hover:border-ring transition-colors select-none">
							Write a comment...
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
