import { format, isToday, isYesterday } from "date-fns";
import { AlertCircle, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { cn, getInitials } from "~/lib/utils";
import { useMessages } from "~/queries/use-messages";
import { useAuthStore } from "~/stores/auth";
import type { ChatMessage } from "~/types";
import { MessageForm } from "../task/message-form";
import { useProjectContext } from "../providers/project-slug-provider";

function formatTime(iso: string) {
	const d = new Date(iso);
	if (isToday(d)) return format(d, "h:mm a");
	if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
	return format(d, "MMM d, h:mm a");
}

interface MessageBubbleProps {
	message: ChatMessage;
	isOwn: boolean;
	/** Hide avatar/name when grouped under the previous message from the same sender. */
	grouped: boolean;
}

function MessageBubble({ message, isOwn, grouped }: MessageBubbleProps) {
	const name = message.sender?.name ?? "Unknown";
	return (
		<div
			className={cn(
				"flex items-end gap-2",
				isOwn ? "flex-row-reverse" : "flex-row",
				grouped ? "mt-0.5" : "mt-3",
			)}>
			<div className="w-7 shrink-0">
				{!grouped && (
					<Avatar className="size-7">
						<AvatarImage src={message.sender?.avatar ?? undefined} />
						<AvatarFallback className="text-[10px]">
							{getInitials(name)}
						</AvatarFallback>
					</Avatar>
				)}
			</div>
			<div
				className={cn(
					"flex max-w-[78%] flex-col",
					isOwn ? "items-end" : "items-start",
				)}>
				{!grouped && (
					<div
						className={cn(
							"mb-0.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground",
							isOwn && "flex-row-reverse",
						)}>
						<span className="font-medium">{isOwn ? "You" : name}</span>
						<span>·</span>
						<span>{formatTime(message.created_at)}</span>
					</div>
				)}
				<div
					className={cn(
						"rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap",
						isOwn
							? "bg-primary text-primary-foreground rounded-br-sm"
							: "bg-accent text-accent-foreground rounded-bl-sm",
						message.pending && "opacity-60",
						message.failed && "ring-1 ring-destructive",
					)}>
					{message.content}
				</div>
				{message.failed && (
					<span className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-destructive">
						<AlertCircle className="size-3" /> Failed to send
					</span>
				)}
			</div>
		</div>
	);
}

function TypingIndicator() {
	const { typingUsers, members, onlineUsers } = useProjectContext();
	if (typingUsers.length === 0) return null;

	const nameFor = (id: number) => {
		const m = members?.find((x) => x.user_id === id);
		if (m?.name) return m.name;
		const o = onlineUsers.find((x) => x.id === id);
		return o?.name ?? "Someone";
	};

	const names = typingUsers.map(nameFor);
	const label =
		names.length === 1
			? `${names[0]} is typing…`
			: names.length === 2
				? `${names[0]} and ${names[1]} are typing…`
				: "Several people are typing…";

	return (
		<div className="px-2 pb-1 text-[11px] italic text-muted-foreground">
			{label}
		</div>
	);
}

interface ProjectChatProps {
	projectId: number;
	className?: string;
}

export function ProjectChat({ projectId, className }: ProjectChatProps) {
	const { user } = useAuthStore();
	const { data, isLoading, isError } = useMessages(projectId);
	const scrollRef = useRef<HTMLDivElement>(null);

	const messages = useMemo(
		() => (data?.data ?? []).filter((m) => !!m),
		[data],
	);

	// Auto-scroll to the newest message whenever the list grows.
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length]);

	return (
		<div className={cn("flex h-full flex-col", className)}>
			<div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
				{isLoading ? (
					<div className="space-y-4 py-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className={cn(
									"flex items-end gap-2",
									i % 2 === 0 ? "flex-row" : "flex-row-reverse",
								)}>
								<Skeleton className="size-7 rounded-full" />
								<Skeleton className="h-9 w-40 rounded-2xl" />
							</div>
						))}
					</div>
				) : isError ? (
					<div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
						<AlertCircle className="size-6" />
						Couldn't load messages.
					</div>
				) : messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
						<MessageSquare className="size-6" />
						<p className="font-medium">No messages yet</p>
						<p className="text-xs">Start the discussion below.</p>
					</div>
				) : (
					messages.map((m, i) => {
						const prev = messages[i - 1];
						const grouped =
							!!prev &&
							prev.sender_id === m.sender_id &&
							!prev.failed &&
							!m.failed;
						return (
							<MessageBubble
								key={m.clientId ?? m.id}
								message={m}
								isOwn={m.sender?.id === user?.id}
								grouped={grouped}
							/>
						);
					})
				)}
			</div>

			<div className="shrink-0 border-t border-border p-3">
				<TypingIndicator />
				<MessageForm projectId={projectId} />
			</div>
		</div>
	);
}
