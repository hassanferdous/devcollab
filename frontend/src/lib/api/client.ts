import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "~/stores/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL;

import { createIsomorphicFn, createServerOnlyFn } from "@tanstack/react-start";
import { parseSetCookie } from "set-cookie-parser";
import { queryClient } from "~/components/providers/query-provider";
import { redirect } from "@tanstack/react-router";

const applyServerHeaders = createIsomorphicFn()
	.server(async (config: InternalAxiosRequestConfig) => {
		const { getRequestHeaders } =
			await import("@tanstack/react-start/server");
		const headers = getRequestHeaders();
		config.headers["Cookie"] = headers.get("cookie");
		config.headers["Referer"] = headers.get("referer");
		config.headers["Origin"] = headers.get("origin");
		config.headers["Authorization"] = headers.get("Authorization");
		return config;
	})
	.client((config: InternalAxiosRequestConfig) => {
		return config;
	});

const forwardCookieToClient = createServerOnlyFn(
	async (setCookieHeader: string[]) => {
		const { setCookie } = await import("@tanstack/react-start/server");
		const cookies = parseSetCookie(setCookieHeader);
		cookies.forEach((cookie) => {
			const { name, value, ...rest } = cookie;
			setCookie(name, value, rest as any);
		});
	},
);

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
			// 1. Prepare the refresh request configuration
			let refreshConfig = {
				method: "post",
				url: `${API_BASE_URL}/auth/refresh-token`,
				data: {},
				withCredentials: true,
				headers: { "Content-Type": "application/json" },
			} as InternalAxiosRequestConfig;

			// 2. Inject browser cookies if running on the server
			refreshConfig = await applyServerHeaders(refreshConfig);

			// 3. Execute the refresh request
			const response = await axios(refreshConfig);
			const { tokens, user } = response.data.data;

			// If backend sends a new set-cookie, forward it back to the browser
			if (typeof window === "undefined") {
				const setCookieHeader = response.headers["set-cookie"];
				forwardCookieToClient(setCookieHeader!);
			}

			useAuthStore.getState().setAuth(user, tokens.access_token);
			processQueue(null, tokens.access_token);

			originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
			return api(originalRequest);
		} catch (refreshError: any) {
			processQueue(refreshError as AxiosError, null);
			queryClient.removeQueries();
			useAuthStore.getState().clearAuth();
			if (typeof window !== "undefined") {
				window.location.href = "/login";
			} else {
				throw redirect({ to: "/login" });
			}
			return Promise.reject(refreshError);
		} finally {
			isRefreshing = false;
		}
	},
);
