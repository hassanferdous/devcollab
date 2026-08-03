import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { getUserSocket } from "~/lib/socket";
import { mentionsToPlainText } from "~/lib/parse-mentions";
import {
	notificationKeys,
	type NotificationListData,
} from "~/queries/use-notifications";
import { useAuthStore } from "~/stores/auth";
import type { NotificationNewPayload } from "~/types";

/**
 * Always-on subscription to the global `/notifications` socket. Mounted once in
 * the app layout so mentions reach the user on any page. Prepends to the list
 * cache, syncs the unread count, and toasts.
 */
export function useNotificationsSocket() {
	const qc = useQueryClient();
	const { isAuthenticated, user } = useAuthStore();

	useEffect(() => {
		if (!isAuthenticated || !user) return;

		const socket = getUserSocket();

		const handler = (payload: NotificationNewPayload) => {
			qc.setQueryData<NotificationListData>(
				notificationKeys.list(),
				(old) => {
					if (!old) return { data: [payload.notification] };
					if (old.data.some((n) => n.id === payload.notification.id)) {
						return old;
					}
					return { ...old, data: [payload.notification, ...old.data] };
				},
			);
			qc.setQueryData<number>(
				notificationKeys.unreadCount(),
				payload.unreadCount,
			);

			const actor = payload.notification.actor?.name ?? "Someone";
			toast(`${actor} mentioned you`, {
				description: payload.notification.preview
					? mentionsToPlainText(payload.notification.preview)
					: undefined,
			});
		};

		socket.on("notification:new", handler);
		return () => {
			socket.off("notification:new", handler);
		};
	}, [isAuthenticated, user, qc]);
}
