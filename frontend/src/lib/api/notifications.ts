import { api } from "./client";

export const notificationApi = {
	getList: (params?: { page?: number; limit?: number }) =>
		api.get("/notifications", { params }),
	getUnreadCount: () => api.get("/notifications/unread-count"),
	markRead: (id: number) => api.patch(`/notifications/${id}/read`),
	markAllRead: () => api.patch("/notifications/read-all"),
};
