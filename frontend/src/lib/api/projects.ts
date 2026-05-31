import { api } from "./client";

export const projectApi = {
	getAll: () => api.get("/projects"),

	getById: (projectId: number) => api.get(`/projects/${projectId}`),

	create: (data: { name: string; description: string; status?: string }) =>
		api.post("/projects", data),

	update: (
		projectId: number,
		data: Partial<{ name: string; description: string; status: string }>,
	) => api.put(`/projects/${projectId}`, data),

	delete: (projectId: number) => api.delete(`/projects/${projectId}`),

	manageMember: (
		projectId: number,
		data:
			| { action: "add"; userId: number; role: string }
			| { action: "remove"; userId: number },
	) => api.patch(`/projects/${projectId}/member`, data),
};
