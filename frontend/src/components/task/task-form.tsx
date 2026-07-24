import { yupResolver } from "@hookform/resolvers/yup";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
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
import type { Task, TaskPriority } from "~/types";

const schema = yup.object({
	title: yup
		.string()
		.min(2, "Title is too short")
		.required("Title is required"),
	description: yup.string().default(""),
	priority: yup
		.mixed<TaskPriority>()
		.oneOf(["low", "medium", "high", "urgent"])
		.default("low"),
	start_date: yup.string().nullable(),
	due_date: yup.string().nullable(),
});

type TaskFormValues = yup.InferType<typeof schema>;

const priorityOptions: {
	value: TaskPriority;
	label: string;
	dotClass: string;
	bgClass: string;
	textClass: string;
}[] = [
	{
		value: "low",
		label: "Low",
		dotClass: "bg-slate-400",
		bgClass: "bg-slate-100 dark:bg-slate-800",
		textClass: "text-slate-600 dark:text-slate-400",
	},
	{
		value: "medium",
		label: "Medium",
		dotClass: "bg-amber-400",
		bgClass: "bg-amber-100 dark:bg-amber-900/40",
		textClass: "text-amber-700 dark:text-amber-400",
	},
	{
		value: "high",
		label: "High",
		dotClass: "bg-orange-500",
		bgClass: "bg-orange-100 dark:bg-orange-900/40",
		textClass: "text-orange-700 dark:text-orange-400",
	},
	{
		value: "urgent",
		label: "Urgent",
		dotClass: "bg-red-500",
		bgClass: "bg-red-100 dark:bg-red-900/40",
		textClass: "text-red-700 dark:text-red-400",
	},
];

interface AttachedFile {
	id: string;
	file: File;
}

interface TaskFormProps {
	defaultValues?: Partial<Task>;
	onSubmit: (data: TaskFormValues) => void;
	isPending: boolean;
	onCancel: () => void;
	submitLabel?: string;
}

export function TaskForm({
	defaultValues,
	onSubmit,
	isPending,
	onCancel,
	submitLabel = "Create task",
}: TaskFormProps) {
	const [attachments, setAttachments] = useState<AttachedFile[]>([]);
	const [dueDateOpen, setDueDateOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const form = useForm<TaskFormValues>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: yupResolver(schema) as any,
		defaultValues: {
			title: defaultValues?.title ?? "",
			description: defaultValues?.description ?? "",
			priority: defaultValues?.priority ?? "low",
			start_date: defaultValues?.start_date?.slice(0, 10) ?? null,
			due_date: defaultValues?.due_date?.slice(0, 10) ?? null,
		},
	});

	const selectedPriority = form.watch("priority") ?? "low";
	const priorityOption =
		priorityOptions.find((p) => p.value === selectedPriority) ??
		priorityOptions[0];

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		const newAttachments = files.map((file) => ({
			id: `${file.name}-${Date.now()}`,
			file,
		}));
		setAttachments((prev) => [...prev, ...newAttachments]);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removeAttachment = (id: string) => {
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				{/* Title */}
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Title</FormLabel>
							<FormControl>
								<Input
									placeholder="What needs to be done?"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Description */}
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								Description{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Add more detail..."
									className="resize-none"
									rows={3}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Priority — full width with colored options */}
				<FormField
					control={form.control}
					name="priority"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Priority</FormLabel>
							<Select
								onValueChange={field.onChange}
								defaultValue={field.value ?? "low"}>
								<FormControl>
									<SelectTrigger className="w-full">
										<SelectValue>
											<span className="flex items-center gap-2">
												<span
													className={cn(
														"inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
														priorityOption.bgClass,
														priorityOption.textClass,
													)}>
													<span
														className={cn(
															"size-1.5 rounded-full",
															priorityOption.dotClass,
														)}
													/>
													{priorityOption.label}
												</span>
											</span>
										</SelectValue>
									</SelectTrigger>
								</FormControl>
								<SelectContent className="w-[var(--radix-select-trigger-width)]">
									{priorityOptions.map((opt) => (
										<SelectItem
											key={opt.value}
											value={opt.value}
											className="cursor-pointer">
											<span
												className={cn(
													"inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
													opt.bgClass,
													opt.textClass,
												)}>
												<span
													className={cn(
														"size-1.5 rounded-full",
														opt.dotClass,
													)}
												/>
												{opt.label}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Due date — shadcn Calendar in Popover */}
				<FormField
					control={form.control}
					name="due_date"
					render={({ field }) => {
						const dateValue = field.value
							? new Date(field.value + "T00:00:00")
							: undefined;
						return (
							<FormItem>
								<FormLabel>
									Due date{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</FormLabel>
								<Popover
									open={dueDateOpen}
									onOpenChange={setDueDateOpen}>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												className={cn(
													"w-full justify-start text-left font-normal",
													!dateValue && "text-muted-foreground",
												)}>
												<CalendarIcon className="mr-2 size-4 opacity-50" />
												{dateValue
													? format(dateValue, "PPP")
													: "Pick a date"}
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={dateValue}
											onSelect={(date) => {
												field.onChange(
													date ? format(date, "yyyy-MM-dd") : "",
												);
												setDueDateOpen(false);
											}}
										/>
										{dateValue && (
											<div className="border-t px-3 pb-3 pt-2">
												<Button
													variant="ghost"
													size="sm"
													className="w-full text-muted-foreground hover:text-foreground text-xs h-7"
													onClick={() => {
														field.onChange("");
														setDueDateOpen(false);
													}}>
													Clear date
												</Button>
											</div>
										)}
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						);
					}}
				/>

				{/* Attachments */}
				<div className="space-y-2">
					<p className="text-sm font-medium leading-none">
						Attachments{" "}
						<span className="font-normal text-muted-foreground">
							(optional)
						</span>
					</p>

					{attachments.length > 0 && (
						<ul className="space-y-1.5">
							{attachments.map((a) => (
								<li
									key={a.id}
									className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
									<Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
									<span className="min-w-0 flex-1 truncate text-xs">
										{a.file.name}
									</span>
									<span className="shrink-0 text-[10px] text-muted-foreground">
										{(a.file.size / 1024).toFixed(0)} KB
									</span>
									<button
										type="button"
										onClick={() => removeAttachment(a.id)}
										className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
										<X className="size-3" />
									</button>
								</li>
							))}
						</ul>
					)}

					<input
						ref={fileInputRef}
						type="file"
						multiple
						className="hidden"
						onChange={handleFileChange}
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-full gap-2 border-dashed text-muted-foreground hover:text-foreground"
						onClick={() => fileInputRef.current?.click()}>
						<Paperclip className="size-3.5" />
						Attach files
					</Button>
				</div>

				{/* Actions */}
				<div className="flex justify-end gap-2 pt-1">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending && <Loader2 className="size-4 animate-spin" />}
						{submitLabel}
					</Button>
				</div>
			</form>
		</Form>
	);
}
