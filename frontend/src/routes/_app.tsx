import { queryOptions } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getCookies, getRequestHeaders } from "@tanstack/react-start/server";
import { AppSidebar } from "~/components/layout/app-sidebar";
import { queryClient } from "~/components/providers/query-provider";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { meFn } from "~/server/auth";
import { useAuthStore } from "~/stores/auth";

export const meQueryOptions = queryOptions({
	queryKey: ["auth", "me"],
	queryFn: meFn,
	retry: false,
});

const authMiddleware = createMiddleware({ type: "request" }).server(
	async ({ next }) => {
		const cookies = getCookies();
		if (!cookies.access_token && !cookies.refresh_token) {
			throw redirect({ to: "/login" });
		}
		try {
			const response = await queryClient.fetchQuery(meQueryOptions);
			if (!response.data) throw redirect({ to: "/login" });
		} catch (error) {
			queryClient.removeQueries({ queryKey: ["auth", "me"] });
			useAuthStore.getState().clearAuth();
			throw redirect({ to: "/login" });
		}
		return next();
	},
);
const fn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return true;
	});
export const Route = createFileRoute("/_app")({
	component: AppLayout,
	server: {
		middleware: [authMiddleware],
	},
});

function AppLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
