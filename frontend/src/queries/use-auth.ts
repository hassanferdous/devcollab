import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { queryClient } from "~/components/providers/query-provider";
import { authApi } from "~/lib/api/auth";
import { disconnectSocket } from "~/lib/socket";
import { useAuthStore } from "~/stores/auth";
import type {
	ForgotPasswordFormData,
	LoginFormData,
	RegisterFormData,
	ResetPasswordFormData,
	VerifyOtpFormData,
} from "~/types";

export function useLogin() {
	const { setAuth } = useAuthStore();
	const router = useRouter();

	return useMutation({
		mutationFn: (data: LoginFormData) => authApi.login(data),
		onSuccess: (res) => {
			const { user, tokens } = res.data.data;
			// Web auth is cookie-based; `tokens` is only sent to mobile clients.
			setAuth(user, tokens?.access_token ?? "");
			router.navigate({ to: "/dashboard" });
		},
	});
}

export function useRegister() {
	const router = useRouter();

	return useMutation({
		mutationFn: (data: Omit<RegisterFormData, "confirmPassword">) =>
			authApi.register(data),
		onSuccess: () => {
			router.navigate({ to: "/login" });
		},
	});
}

export function useLogout() {
	const { clearAuth } = useAuthStore();
	const router = useRouter();

	return useMutation({
		mutationFn: () => authApi.logout(),
		onSuccess: async () => {
			clearAuth();
			disconnectSocket();
			queryClient.removeQueries(); // wipes all cached data immediately
			await router.invalidate();
			window.location.href = "/login";
		},
	});
}

export function useForgotPassword() {
	return useMutation({
		mutationFn: (data: ForgotPasswordFormData) =>
			authApi.forgotPassword(data.email),
	});
}

export function useVerifyOtp() {
	return useMutation({
		mutationFn: (data: VerifyOtpFormData) => authApi.verifyOtp(data),
	});
}

export function useResetPassword() {
	const router = useRouter();

	return useMutation({
		mutationFn: (data: ResetPasswordFormData) =>
			authApi.resetPassword({
				newPassword: data.newPassword,
				token: data.token,
			}),
		onSuccess: () => {
			router.navigate({ to: "/login" });
		},
	});
}
