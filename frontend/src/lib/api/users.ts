import { api } from "./client";

export const userApi = {
	getAll: () => api.get("/users"),
	getById: (id: number) => api.get(`/users/${id}`),
	update: (
		id: number,
		data: Partial<{ name: string; email: string; password: string }>,
	) => api.put(`/users/${id}`, data),
	delete: (id: number) => api.delete(`/users/${id}`),
};
