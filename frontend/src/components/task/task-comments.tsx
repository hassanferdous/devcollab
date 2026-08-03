import { format } from "date-fns";
import { AlertCircle, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { describeActivity } from "~/lib/describe-activity";
import { cn, getInitials } from "~/lib/utils";
import { useComments } from "~/queries/use-comments";
import { useTaskActivity } from "~/queries/use-tasks";
import { useAuthStore } from "~/stores/auth";
import type {
	CommentItem,
	ProjectMember,
	TaskActivity,
	TaskAssignee,
} from "~/types";
import { MentionText } from "../comment/mention-text";
import { CommentForm } from "./comment-form";

function formatWhen(iso: string) {
	return format(new Date(iso), "MMM d, yyyy, h:mm a");
}

/** A single Trello-style comment: avatar, name + timestamp, then a grey bubble. */
function CommentRow({
	comment,
	currentUserId,
}: {
	comment: CommentItem;
	currentUserId?: number;
}) {
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
						{formatWhen(comment.created_at)}
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

/** A compact activity line: avatar, "<actor> <action>", timestamp — no bubble. */
function ActivityRow({ activity }: { activity: TaskActivity }) {
	const name = activity.actor?.name ?? "Someone";
	return (
		<div className="flex gap-2">
			<Avatar className="mt-0.5 size-7 shrink-0">
				<AvatarImage src={activity.actor?.avatar ?? undefined} />
				<AvatarFallback className="text-[10px]">
					{getInitials(name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1 leading-tight">
				<p className="text-sm">
					<span className="font-semibold">{name}</span>{" "}
					<span className="text-muted-foreground">
						{describeActivity(activity)}
					</span>
				</p>
				<span className="cursor-default text-xs text-blue-600 hover:underline dark:text-blue-400">
					{formatWhen(activity.created_at)}
				</span>
			</div>
		</div>
	);
}

type TimelineItem =
	| { kind: "comment"; at: number; key: string; comment: CommentItem }
	| { kind: "activity"; at: number; key: string; activity: TaskActivity };

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
	const { data: activity = [] } = useTaskActivity(projectId, taskId);

	// Merge comments + activity into one feed, newest first.
	const timeline = useMemo<TimelineItem[]>(() => {
		const comments = (data?.data ?? []).filter((c) => !!c);
		const items: TimelineItem[] = [
			...comments.map((c) => ({
				kind: "comment" as const,
				at: new Date(c.created_at).getTime(),
				key: `c-${c.clientId ?? c.id}`,
				comment: c,
			})),
			...activity.map((a) => ({
				kind: "activity" as const,
				at: new Date(a.created_at).getTime(),
				key: `a-${a.id}`,
				activity: a,
			})),
		];
		return items.sort((x, y) => y.at - x.at);
	}, [data, activity]);

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

			{/* Comments + activity feed, newest first */}
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
				) : timeline.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
						<MessageSquare className="size-6" />
						<p className="font-medium">No activity yet</p>
						<p className="text-xs">Be the first to comment on this card.</p>
					</div>
				) : (
					timeline.map((item) =>
						item.kind === "comment" ? (
							<CommentRow
								key={item.key}
								comment={item.comment}
								currentUserId={user?.id}
							/>
						) : (
							<ActivityRow key={item.key} activity={item.activity} />
						),
					)
				)}
			</div>
		</div>
	);
}
