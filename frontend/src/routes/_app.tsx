import { queryOptions } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "~/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { meFn } from "~/server/auth.functions";

export const meQueryOptions = queryOptions({
	queryKey: ["auth", "me"],
	queryFn: meFn,
	retry: false,
	staleTime: 1000 * 60 * 5,
});

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context }) => {
		try {
			const user = await context.queryClient.ensureQueryData(meQueryOptions);
			return { user };
		} catch (err: any) {
			// throw redirect({ to: "/login" });
		}
	},
	component: AppLayout,
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
