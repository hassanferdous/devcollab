import { api } from "./client";

export const taskApi = {
	getAll: (projectId: number, params?: { page?: number; limit?: number }) =>
		api.get(`/projects/${projectId}/tasks`, { params }),

	getById: (projectId: number, taskId: number) =>
		api.get(`/projects/${projectId}/tasks/${taskId}`),

	create: (projectId: number, data: { title: string; description: string }) =>
		api.post(`/projects/${projectId}/tasks`, data),

	update: (
		projectId: number,
		taskId: number,
		data: Partial<{
			title: string;
			description: string;
			status: string;
			priority: string;
			start_date: string;
			due_date: string;
		}>,
	) => api.patch(`/projects/${projectId}/tasks/${taskId}`, data),

	reorder: (
		projectId: number,
		taskId: number,
		data: { status: string; task_ids: number[] },
	) => api.patch(`/projects/${projectId}/tasks/${taskId}/reorder`, data),

	delete: (projectId: number, taskId: number) =>
		api.delete(`/projects/${projectId}/tasks/${taskId}`),

	getAssignees: (projectId: number, taskId: number) =>
		api.get(`/projects/${projectId}/tasks/${taskId}/assignees`),

	getActivity: (projectId: number, taskId: number) =>
		api.get(`/projects/${projectId}/tasks/${taskId}/activity`),

	addAssignees: (projectId: number, taskId: number, userIds: number[]) =>
		api.post(`/projects/${projectId}/tasks/${taskId}/assignees`, {
			user_ids: userIds,
		}),

	removeAssignee: (projectId: number, taskId: number, userId: number) =>
		api.delete(`/projects/${projectId}/tasks/${taskId}/assignees/${userId}`),
};
