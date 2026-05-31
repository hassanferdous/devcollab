import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "~/types";

export interface AuthState {
	user: User | null;
	accessToken: string | null;
	isAuthenticated: boolean;
	setAuth: (user: User, accessToken: string) => void;
	clearAuth: () => void;
	updateUser: (user: Partial<User>) => void;
	isHydrated: boolean;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			user: null,
			accessToken: null,
			isAuthenticated: false,
			isHydrated: false,
			setAuth: (user, accessToken) => {
				set({ user, accessToken, isAuthenticated: true });
			},

			clearAuth: () => {
				set({ user: null, accessToken: null, isAuthenticated: false });
			},

			updateUser: (updates) => {
				const current = get().user;
				if (!current) return;
				set({ user: { ...current, ...updates } });
			},
		}),
		{
			name: "devcollab-auth",
			partialize: (state) => ({
				user: state.user,
				accessToken: state.accessToken,
				isAuthenticated: state.isAuthenticated,
			}),
			onRehydrateStorage(state) {
				state.isHydrated = true;
			},
		},
	),
);
