import { api } from "./client";

export const commentApi = {
	getHistory: (
		projectId: number,
		taskId: number,
		params?: { page?: number; limit?: number },
	) =>
		api.get(`/projects/${projectId}/tasks/${taskId}/comments`, { params }),
};
