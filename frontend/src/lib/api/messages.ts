import { api } from "./client";

export const messageApi = {
	getHistory: (projectId: number, params?: { page?: number; limit?: number }) =>
		api.get(`/projects/${projectId}/chat/messages`, { params }),
};
