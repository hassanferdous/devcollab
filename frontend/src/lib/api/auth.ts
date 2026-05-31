import { api } from "./client";

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
		window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
	},
};
