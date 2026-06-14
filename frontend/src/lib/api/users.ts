import { api } from "./client";

export const userApi = {
	getAll: (params?: { search?: string; page?: number; limit?: number }) =>
		api.get("/users", { params }),
	getById: (id: number) => api.get(`/users/${id}`),
	update: (
		id: number,
		data: Partial<{ name: string; email: string; password: string }>,
	) => api.put(`/users/${id}`, data),
	delete: (id: number) => api.delete(`/users/${id}`),
};
