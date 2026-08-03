import { format } from "date-fns";
import { AlertCircle, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, getInitials } from "~/lib/utils";
import { useComments } from "~/queries/use-comments";
import { useAuthStore } from "~/stores/auth";
import type { CommentItem, ProjectMember, TaskAssignee } from "~/types";
import { MentionText } from "../comment/mention-text";
import { CommentForm } from "./comment-form";

interface CommentRowProps {
	comment: CommentItem;
	currentUserId?: number;
}

/** A single Trello-style comment: avatar, name + timestamp, then a grey bubble. */
function CommentRow({ comment, currentUserId }: CommentRowProps) {
	const name = comment.sender?.name ?? "Unknown";
	return (
		<div className="flex gap-2">
			<Avatar className="mt-0.5 size-7 shrink-0">
				<AvatarImage src={comment.sender?.avatar ?? undefined} />
				<AvatarFallback className="text-[10px]">
					{getInitials(name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-x-2">
					<span className="text-sm font-semibold">{name}</span>
					<span className="cursor-default text-xs text-blue-600 hover:underline dark:text-blue-400">
						{format(new Date(comment.created_at), "MMM d, yyyy, h:mm a")}
					</span>
				</div>
				<div
					className={cn(
						"mt-1 inline-block max-w-full rounded-lg bg-muted px-3 py-2 text-sm shadow-sm",
						comment.pending && "opacity-60",
						comment.failed && "ring-1 ring-destructive",
					)}>
					<MentionText
						content={comment.content}
						currentUserId={currentUserId}
					/>
				</div>
				{comment.failed && (
					<span className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
						<AlertCircle className="size-3" /> Failed to send
					</span>
				)}
			</div>
		</div>
	);
}

interface TaskCommentsProps {
	projectId: number;
	taskId: number;
	assignees: TaskAssignee[];
	members: ProjectMember[];
	className?: string;
}

export function TaskComments({
	projectId,
	taskId,
	assignees,
	members,
	className,
}: TaskCommentsProps) {
	const { user } = useAuthStore();
	const { data, isLoading, isError } = useComments(projectId, taskId);

	// Trello lists newest first; the cache holds oldest → newest.
	const comments = useMemo(
		() => [...(data?.data ?? []).filter((c) => !!c)].reverse(),
		[data],
	);

	return (
		<div className={cn("flex h-full flex-col", className)}>
			{/* Composer pinned at the top, Trello-style */}
			<div className="shrink-0 px-3 pt-3 pb-1">
				<CommentForm
					projectId={projectId}
					taskId={taskId}
					assignees={assignees}
					members={members}
				/>
			</div>

			{/* Comments list, newest first */}
			<div className="flex-1 space-y-4 overflow-y-auto px-3 pt-2 pb-3">
				{isLoading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex gap-2">
								<Skeleton className="size-7 shrink-0 rounded-full" />
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-3 w-40" />
									<Skeleton className="h-12 w-full rounded-lg" />
								</div>
							</div>
						))}
					</div>
				) : isError ? (
					<div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
						<AlertCircle className="size-6" />
						Couldn't load comments.
					</div>
				) : comments.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
						<MessageSquare className="size-6" />
						<p className="font-medium">No comments yet</p>
						<p className="text-xs">Be the first to comment on this card.</p>
					</div>
				) : (
					comments.map((c) => (
						<CommentRow
							key={c.clientId ?? c.id}
							comment={c}
							currentUserId={user?.id}
						/>
					))
				)}
			</div>
		</div>
	);
}
