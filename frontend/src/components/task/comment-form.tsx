import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem } from "~/components/ui/form";
import { useDebounce } from "~/hooks/use-debounce";
import { getProjectSocket } from "~/lib/socket";
import { extractMentionedIds } from "~/lib/parse-mentions";
import { cn, getInitials } from "~/lib/utils";
import { commentKeys, type CommentListData } from "~/queries/use-comments";
import { useAuthStore } from "~/stores/auth";
import type { CommentItem, ProjectMember, TaskAssignee } from "~/types";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useProjectContext } from "../providers/project-slug-provider";
import { useAbility } from "@casl/react";

interface CommentFormProps {
	projectId: number;
	taskId: number;
	assignees: TaskAssignee[];
	members: ProjectMember[];
}

interface MentionCandidate {
	userId: number;
	name: string;
	email: string;
	avatar: string | null;
	isAssignee: boolean;
}

// Matches an in-progress "@query" immediately before the caret.
const TRIGGER_RE = /(?:^|\s)@([^\s@\]]*)$/;

export function CommentForm({
	projectId,
	taskId,
	assignees,
	members,
}: CommentFormProps) {
	const qc = useQueryClient();
	const { user } = useAuthStore();
	const { onlineUsers } = useProjectContext();
	const form = useForm({ defaultValues: { comment: "" } });
	const { debouncedFn } = useDebounce();
	const taRef = useRef<HTMLTextAreaElement | null>(null);
	const isTyping = useRef<boolean>(false);
	const [isFocused, setIsFocused] = useState(false);

	// Mention dropdown state.
	const [mentionQuery, setMentionQuery] = useState<string | null>(null);
	const [mentionStart, setMentionStart] = useState(0);
	const [highlight, setHighlight] = useState(0);

	// All mentionable members, assignees first (and tagged), avatars enriched.
	const candidates = useMemo<MentionCandidate[]>(() => {
		const assigneeIds = new Set(assignees.map((a) => a.user_id));
		const avatarById = new Map<number, string | null>();
		assignees.forEach((a) => avatarById.set(a.user_id, a.avatar));
		onlineUsers.forEach((u) => {
			if (!avatarById.has(u.id)) avatarById.set(u.id, u.avatar);
		});
		return members
			.map((m) => ({
				userId: m.user_id,
				name: m.name ?? m.email,
				email: m.email,
				avatar: avatarById.get(m.user_id) ?? null,
				isAssignee: assigneeIds.has(m.user_id),
			}))
			.sort(
				(a, b) =>
					Number(b.isAssignee) - Number(a.isAssignee) ||
					a.name.localeCompare(b.name),
			);
	}, [members, assignees, onlineUsers]);

	const filtered = useMemo(() => {
		if (mentionQuery === null) return [];
		const q = mentionQuery.toLowerCase();
		return candidates
			.filter(
				(c) =>
					!q ||
					c.name.toLowerCase().includes(q) ||
					c.email.toLowerCase().includes(q),
			)
			.slice(0, 8);
	}, [candidates, mentionQuery]);

	const dropdownOpen = mentionQuery !== null && filtered.length > 0;

	/** Recompute the mention trigger from the text before the caret. */
	const syncMention = (value: string, caret: number) => {
		const match = TRIGGER_RE.exec(value.slice(0, caret));
		if (match) {
			setMentionQuery(match[1]);
			setMentionStart(caret - match[1].length - 1); // position of "@"
			setHighlight(0);
		} else if (mentionQuery !== null) {
			setMentionQuery(null);
		}
	};

	const selectCandidate = (c: MentionCandidate) => {
		const el = taRef.current;
		const value = form.getValues("comment");
		const caret = el?.selectionStart ?? value.length;
		const token = `@[${c.name}](${c.userId}) `;
		const next = value.slice(0, mentionStart) + token + value.slice(caret);
		form.setValue("comment", next, { shouldDirty: true });
		setMentionQuery(null);
		// Restore caret just after the inserted token once React re-renders.
		const nextCaret = mentionStart + token.length;
		requestAnimationFrame(() => {
			el?.focus();
			el?.setSelectionRange(nextCaret, nextCaret);
		});
	};

	const markFailed = (clientId: string) => {
		qc.setQueryData<CommentListData>(commentKeys.lists(taskId), (old) => {
			if (!old) return old;
			return {
				...old,
				data: old.data.map((m) =>
					m.clientId === clientId && m.pending
						? { ...m, pending: false, failed: true }
						: m,
				),
			};
		});
	};

	const onSubmit = (data: { comment: string }) => {
		const content = data.comment.trim();
		if (!content || !user) return;

		const socket = getProjectSocket(projectId);
		const clientId = crypto.randomUUID();
		const now = new Date().toISOString();
		const mentionedUserIds = extractMentionedIds(content);

		const optimistic: CommentItem = {
			id: -Date.now(),
			project_id: projectId,
			task_id: taskId,
			sender_id: user.id,
			content,
			mentioned_user_ids: mentionedUserIds,
			is_edited: false,
			created_at: now,
			updated_at: now,
			sender: { id: user.id, name: user.name, avatar: user.avatar },
			clientId,
			pending: true,
		};

		qc.setQueryData<CommentListData>(commentKeys.lists(taskId), (old) => ({
			data: [...(old?.data ?? []), optimistic],
			pagination: old?.pagination,
		}));

		socket.emit(
			"comment:create",
			{ taskId, content, clientId, mentionedUserIds },
			(ack) => {
				if (!ack?.ok) {
					markFailed(clientId);
					toast.error(ack?.error ?? "Failed to send comment");
				}
			},
		);

		socket.emit("user:typing-stop");
		isTyping.current = false;
		form.reset();
		setMentionQuery(null);
		setIsFocused(false);
	};

	const handleTypingStop = debouncedFn(() => {
		getProjectSocket(projectId).emit("user:typing-stop");
		isTyping.current = false;
	}, 1000);

	const value = form.watch("comment");
	const isActive = isFocused || value.trim().length > 0;

	const canComment = useAbility().can("update", "Task");

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				{/* Composer box + mention dropdown share a relative container */}
				<div className="relative">
					<FormField
						control={form.control}
						name="comment"
						render={({ field: { onBlur, onChange, ref, ...field } }) => (
							<FormItem>
								<FormControl>
									<Textarea
										{...field}
										disabled={!canComment}
										ref={(el) => {
											ref(el);
											taRef.current = el;
										}}
										placeholder="Write a comment…"
										className="min-h-[42px] resize-none bg-background shadow-sm"
										onChange={(e) => {
											onChange(e);
											syncMention(
												e.target.value,
												e.target.selectionStart ??
													e.target.value.length,
											);
										}}
										onBlur={() => {
											setMentionQuery(null);
										}}
										onFocus={() => setIsFocused(true)}
										onKeyDown={(e) => {
											if (dropdownOpen) {
												if (e.key === "ArrowDown") {
													e.preventDefault();
													setHighlight(
														(h) => (h + 1) % filtered.length,
													);
													return;
												}
												if (e.key === "ArrowUp") {
													e.preventDefault();
													setHighlight(
														(h) =>
															(h - 1 + filtered.length) %
															filtered.length,
													);
													return;
												}
												if (e.key === "Enter" || e.key === "Tab") {
													e.preventDefault();
													selectCandidate(filtered[highlight]);
													return;
												}
												if (e.key === "Escape") {
													e.preventDefault();
													setMentionQuery(null);
													return;
												}
											}
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												form.handleSubmit(onSubmit)();
												return;
											}
											handleTypingStop(undefined);
											if (isTyping.current) return;
											getProjectSocket(projectId).emit(
												"user:typing",
											);
											isTyping.current = true;
										}}
										onKeyUp={(e) =>
											syncMention(
												e.currentTarget.value,
												e.currentTarget.selectionStart ??
													e.currentTarget.value.length,
											)
										}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					{/* Mention dropdown — opens below the textarea, keeps focus in it */}
					{dropdownOpen && (
						<div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
							{filtered.map((c, i) => (
								<button
									key={c.userId}
									type="button"
									// onMouseDown (not onClick) so the textarea doesn't blur first.
									onMouseDown={(e) => {
										e.preventDefault();
										selectCandidate(c);
									}}
									onMouseEnter={() => setHighlight(i)}
									className={cn(
										"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
										i === highlight
											? "bg-accent text-accent-foreground"
											: "hover:bg-accent/60",
									)}>
									<Avatar className="size-6 shrink-0">
										<AvatarImage src={c.avatar ?? undefined} />
										<AvatarFallback className="text-[9px]">
											{getInitials(c.name)}
										</AvatarFallback>
									</Avatar>
									<span className="min-w-0 flex-1 truncate">
										{c.name}
									</span>
									{c.isAssignee && (
										<span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
											Assignee
										</span>
									)}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Save button appears once the composer is engaged */}
				{isActive && (
					<div className="mt-2 flex justify-end gap-2">
						<Button
							className="h-auto px-3 py-1.5 text-xs"
							type="submit"
							disabled={!value.trim()}>
							Save
						</Button>
					</div>
				)}
			</form>
		</Form>
	);
}
