import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "~/stores/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL;

import { createIsomorphicFn } from "@tanstack/react-start";

const applyServerHeaders = createIsomorphicFn()
	.server(async (config: InternalAxiosRequestConfig) => {
		const { getRequestHeaders } =
			await import("@tanstack/react-start/server");
		const headers = getRequestHeaders();
		config.headers["Cookie"] = headers.get("cookie");
		config.headers["Referer"] = headers.get("referer");
		config.headers["Origin"] = headers.get("origin");
		return config;
	})
	.client((config: InternalAxiosRequestConfig) => {
		return config;
	});

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
	return applyServerHeaders(config);
});

api.interceptors.response.use(
	(res) => res,
	async (error: AxiosError) => {
		console.log(error.message);
		// const originalRequest = error.config as InternalAxiosRequestConfig & {
		// 	_retry?: boolean;
		// };

		// if (error.response?.status !== 401 || originalRequest._retry) {
		// 	return Promise.reject(error);
		// }

		// if (isRefreshing) {
		// 	return new Promise((resolve, reject) => {
		// 		failedQueue.push({ resolve, reject });
		// 	}).then((token) => {
		// 		originalRequest.headers.Authorization = `Bearer ${token}`;
		// 		return api(originalRequest);
		// 	});
		// }

		// originalRequest._retry = true;
		// isRefreshing = true;

		// try {
		// 	const response = await axios.post(
		// 		`${API_BASE_URL}/auth/refresh-token`,
		// 		{},
		// 		{ withCredentials: true },
		// 	);
		// 	const { tokens, user } = response.data.data;
		// 	useAuthStore.getState().setAuth(user, tokens.access_token);
		// 	processQueue(null, tokens.access_token);
		// 	originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
		// 	return api(originalRequest);
		// } catch (refreshError) {
		// 	processQueue(refreshError as AxiosError, null);
		// 	useAuthStore.getState().clearAuth();
		// 	if (typeof window !== "undefined") {
		// 		window.location.href = "/login";
		// 	}
		// 	return Promise.reject(refreshError);
		// } finally {
		// 	isRefreshing = false;
		// }
	},
);
