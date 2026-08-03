import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { mentionsToPlainText } from "~/lib/parse-mentions";
import { cn, getInitials } from "~/lib/utils";
import {
	useMarkAllRead,
	useMarkRead,
	useNotifications,
	useUnreadCount,
} from "~/queries/use-notifications";
import type { AppNotification } from "~/types";

export function NotificationBell() {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const { data } = useNotifications();
	const { data: unread = 0 } = useUnreadCount();
	const { mutate: markRead } = useMarkRead();
	const { mutate: markAllRead } = useMarkAllRead();

	const notifications = data?.data ?? [];

	const onRowClick = (n: AppNotification) => {
		if (!n.is_read) markRead(n.id);
		setOpen(false);
		if (n.project_id) {
			navigate({
				to: "/projects/$projectId",
				params: { projectId: String(n.project_id) },
			});
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative"
					aria-label="Notifications">
					<Bell className="size-5" />
					{unread > 0 && (
						<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
							{unread > 9 ? "9+" : unread}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0 gap-0">
				<div className="flex items-center justify-between border-b border-border px-3 py-2">
					<span className="text-sm font-semibold">Notifications</span>
					{unread > 0 && (
						<button
							type="button"
							onClick={() => markAllRead()}
							className="text-xs text-muted-foreground transition-colors hover:text-foreground">
							Mark all read
						</button>
					)}
				</div>
				<div className="max-h-96 overflow-y-auto">
					{notifications.length === 0 ? (
						<div className="px-3 py-10 text-center text-sm text-muted-foreground">
							No notifications yet
						</div>
					) : (
						notifications.map((n) => {
							const actor = n.actor?.name ?? "Someone";
							return (
								<button
									key={n.id}
									type="button"
									onClick={() => onRowClick(n)}
									className={cn(
										"flex w-full gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-accent/50",
										!n.is_read && "bg-accent/40",
									)}>
									<Avatar className="size-8 shrink-0">
										<AvatarImage src={n.actor?.avatar ?? undefined} />
										<AvatarFallback className="text-[10px]">
											{getInitials(actor)}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<p className="text-sm">
											<span className="font-medium">{actor}</span>{" "}
											mentioned you
										</p>
										{n.preview && (
											<p className="truncate text-xs text-muted-foreground">
												{mentionsToPlainText(n.preview)}
											</p>
										)}
										<p className="mt-0.5 text-[10px] text-muted-foreground">
											{formatDistanceToNow(new Date(n.created_at), {
												addSuffix: true,
											})}
										</p>
									</div>
									{!n.is_read && (
										<span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
									)}
								</button>
							);
						})
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
