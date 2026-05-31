import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "~/stores/auth.store";
const API_BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
	headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
	resolve: (value: unknown) => void;
	reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null = null) {
	failedQueue.forEach(({ resolve, reject }) => {
		if (error) reject(error);
		else resolve(token);
	});
	failedQueue = [];
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
	if (typeof window === "undefined") {
		const { getRequestHeaders } =
			await import("@tanstack/react-start/server");
		const headers = getRequestHeaders();
		config.headers["Cookie"] = headers.get("cookie");
		config.headers["Referer"] = headers.get("referer");
		config.headers["Origin"] = headers.get("origin");
	}
	return config;
});

api.interceptors.response.use(
	(res) => res,
	async (error: AxiosError) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & {
			_retry?: boolean;
		};

		if (error.response?.status !== 401 || originalRequest._retry) {
			return Promise.reject(error);
		}

		if (isRefreshing) {
			return new Promise((resolve, reject) => {
				failedQueue.push({ resolve, reject });
			}).then((token) => {
				originalRequest.headers.Authorization = `Bearer ${token}`;
				return api(originalRequest);
			});
		}

		originalRequest._retry = true;
		isRefreshing = true;

		try {
			const response = await axios.post(
				`${API_BASE_URL}/auth/refresh-token`,
				{},
				{ withCredentials: true },
			);
			const { tokens, user } = response.data.data;
			useAuthStore.getState().setAuth(user, tokens.access_token);
			processQueue(null, tokens.access_token);
			originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
			return api(originalRequest);
		} catch (refreshError) {
			processQueue(refreshError as AxiosError, null);
			useAuthStore.getState().clearAuth();
			if (typeof window !== "undefined") {
				window.location.href = "/login";
			}
			return Promise.reject(refreshError);
		} finally {
			isRefreshing = false;
		}
	},
);

// Auth endpoints
export const authApi = {
	login: <T>(data: T) => api.post("/auth/login", data),
	me: () => api.get("/auth/me"),

	register: (data: { name: string; email: string; password: string }) =>
		api.post("/auth/register", data),

	logout: () => api.post("/auth/logout"),

	refreshToken: () => api.post("/auth/refresh-token"),

	forgotPassword: (email: string) =>
		api.post("/auth/forgot-password", { email }),

	verifyOtp: (data: { email: string; otp: string }) =>
		api.post("/auth/verify-otp", data),

	resetPassword: (data: { newPassword: string; token: string }) =>
		api.post("/auth/reset-password", data),

	googleAuth: () => {
		window.location.href = `${API_BASE_URL}/auth/google`;
	},
};

// User endpoints
export const userApi = {
	getAll: () => api.get("/users"),
	getById: (id: number) => api.get(`/users/${id}`),
	update: (
		id: number,
		data: Partial<{ name: string; email: string; password: string }>,
	) => api.put(`/users/${id}`, data),
	delete: (id: number) => api.delete(`/users/${id}`),
};

// Project endpoints
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

// Task endpoints
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

	delete: (projectId: number, taskId: number) =>
		api.delete(`/projects/${projectId}/tasks/${taskId}`),
};
