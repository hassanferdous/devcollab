import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { notificationApi } from "~/lib/api/notifications";
import type { AppNotification, PaginationMeta } from "~/types";

export const notificationKeys = {
	all: ["notifications"] as const,
	list: () => [...notificationKeys.all, "list"] as const,
	unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export interface NotificationListData {
	data: AppNotification[];
	pagination?: PaginationMeta;
}

export function useNotifications() {
	return useQuery({
		queryKey: notificationKeys.list(),
		queryFn: async (): Promise<NotificationListData> => {
			const res = await notificationApi.getList({ page: 1, limit: 20 });
			return res.data.data as NotificationListData;
		},
	});
}

export function useUnreadCount() {
	return useQuery({
		queryKey: notificationKeys.unreadCount(),
		queryFn: async (): Promise<number> => {
			const res = await notificationApi.getUnreadCount();
			return Number(res.data.data?.count) || 0;
		},
	});
}

export function useMarkRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => notificationApi.markRead(id),
		onMutate: (id) => {
			let wasUnread = false;
			qc.setQueryData<NotificationListData>(
				notificationKeys.list(),
				(old) => {
					if (!old) return old;
					return {
						...old,
						data: old.data.map((n) => {
							if (n.id === id && !n.is_read) wasUnread = true;
							return n.id === id ? { ...n, is_read: true } : n;
						}),
					};
				},
			);
			if (wasUnread) {
				qc.setQueryData<number>(notificationKeys.unreadCount(), (c) =>
					Math.max(0, (c ?? 0) - 1),
				);
			}
		},
	});
}

export function useMarkAllRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => notificationApi.markAllRead(),
		onMutate: () => {
			qc.setQueryData<NotificationListData>(
				notificationKeys.list(),
				(old) =>
					old
						? { ...old, data: old.data.map((n) => ({ ...n, is_read: true })) }
						: old,
			);
			qc.setQueryData<number>(notificationKeys.unreadCount(), 0);
		},
	});
}
