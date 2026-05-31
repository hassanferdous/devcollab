import { queryOptions } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "~/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { meFn } from "~/server/auth";

export const meQueryOptions = queryOptions({
	queryKey: ["auth", "me"],
	queryFn: meFn,
	retry: false,
	staleTime: 1000,
});

export const Route = createFileRoute("/_app")({
	beforeLoad: async ({ context }) => {
		let user = null;
		try {
			user = await context.queryClient.fetchQuery(meQueryOptions);
		} catch (err: any) {
			console.log(" **** 401 = Unauthenticated **** ");
		}

		if (user) throw redirect({ to: "/login" });
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
