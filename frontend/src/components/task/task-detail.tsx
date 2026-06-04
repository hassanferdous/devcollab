import { addDays, format } from "date-fns";
import {
	AlignLeft,
	ArrowRight,
	CalendarClock,
	Calendar as CalendarIcon,
	CalendarPlus,
	CheckSquare,
	ChevronDown,
	Circle,
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Calendar } from "~/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type {
	ProjectMember,
	Task,
	TaskPriority,
	TaskStatus,
	UpdateTaskFormData,
} from "~/types";
import { DateRange } from "react-day-picker";
import { ButtonGroup } from "../ui/button-group";
import { Separator } from "../ui/separator";

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
		label: "To Do",
		badgeCls:
			"bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
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

	const creator = members.find((m) => m.user_id === task.created_by);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="sm:max-w-5xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
				<DialogTitle className="sr-only">{task.title}</DialogTitle>

				{/* Top bar */}
				<div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b border-border">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								disabled={!canEdit || isUpdating}
								className={cn(
									"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-70",
									statusConfig[task.status].badgeCls,
								)}>
								{statusConfig[task.status].label}
								<ChevronDown className="size-3" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="min-w-[160px]">
							{(Object.keys(statusConfig) as TaskStatus[]).map((s) => (
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
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<div className="flex items-center gap-0.5">
						<button className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
							<Image className="size-4" />
						</button>
						{canEdit && (
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
						)}
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
								className="w-full resize-none h-auto min-h-auto p-0 border-none font-semibold text-xl!"
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

							<Popover>
								<PopoverTrigger asChild>
									<Button variant="accent">
										<CalendarPlus className="size-3.5" />
										Start Date
										<ArrowRight className="size-3" />
										<CalendarClock className="size-3.5" />
										Due Date
									</Button>
								</PopoverTrigger>
								<PopoverContent align="start" className="w-auto">
									<Calendar
										selected={dateRange}
										onSelect={setDateRange}
										mode="range"
									/>
								</PopoverContent>
							</Popover>
							<ButtonGroup>
								<Button className="pr-0" variant="accent" aria-haspopup>
									Priority
									<ArrowRight className="size-3" />
								</Button>
								<Select
									value={task.priority}
									onValueChange={(val) => {
										if (canEdit)
											onUpdate(task.id, {
												priority: val as TaskPriority,
											});
									}}
									disabled={!canEdit || isUpdating}>
									<SelectTrigger className="bg-accent text-accent-foreground font-medium border-accent w-auto pl-2">
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
										{(
											Object.keys(priorityConfig) as TaskPriority[]
										).map((p) => (
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
										))}
									</SelectContent>
								</Select>
							</ButtonGroup>
						</div>

						{/* Members */}
						{members.length > 0 && (
							<div>
								<div className="flex items-center gap-2 mb-2">
									<Users className="size-4 text-muted-foreground shrink-0" />
									<span className="text-sm font-semibold text-muted-foreground">
										Members
									</span>
								</div>
								<div className="flex flex-wrap items-center ml-6">
									{members.map((m) => (
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
									{canEdit && (
										<Button
											className="size-8 rounded-full ml-1"
											variant="accent"
											size="icon"
											aria-haspopup>
											<Plus className="size-3.5" />
										</Button>
									)}
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
								{canEdit && !editingDescription && (
									<button
										onClick={() => setEditingDescription(true)}
										className="rounded-md px-3 py-1 text-xs text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors">
										Edit
									</button>
								)}
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
											className="resize-none text-sm min-h-auto"
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
									<div
										onClick={() =>
											canEdit && setEditingDescription(true)
										}
										className={cn(
											"text-sm whitespace-pre-wrap min-h-[60px] rounded-md px-3 py-2.5 transition-colors break-words",
											description
												? "text-foreground"
												: "text-muted-foreground italic",
											canEdit && "cursor-pointer hover:bg-muted",
										)}>
										{description ||
											"Add a more detailed description..."}
									</div>
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
