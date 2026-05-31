import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { queryClient } from "~/components/providers/query-provider";
import { authApi } from "~/lib/api";
import { disconnectSocket } from "~/lib/socket";
import { useAuthStore } from "~/stores/auth.store";
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
			setAuth(user, tokens.access_token);
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
			await queryClient.invalidateQueries({ refetchType: "all" });
			await router.invalidate();
			router.navigate({ to: "/login" });
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
