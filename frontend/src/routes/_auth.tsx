import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { ThemeToggle } from "~/components/layout/theme-toggle";
import { meQueryOptions } from "./_app";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async ({ context }) => {
		console.log("**** checking auth ************");
		let user = null;
		try {
			user = await context.queryClient.fetchQuery(meQueryOptions);
		} catch (error) {
			console.log(" ******* unauthenticated ****");
			return;
		}

		if (user) throw redirect({ to: "/dashboard" });
	},
});

function AuthLayout() {
	return (
		<div className="flex min-h-svh flex-col">
			<header className="flex h-14 items-center justify-between px-6">
				<div className="flex items-center gap-2">
					<div className="flex size-7 items-center justify-center rounded-lg bg-primary">
						<Home className="size-3.5 text-primary-foreground" />
					</div>
					<span className="text-sm font-semibold">DevCollab</span>
				</div>
				<ThemeToggle />
			</header>

			<main className="flex flex-1 items-center justify-center p-6">
				<div className="w-full max-w-sm">
					<Outlet />
				</div>
			</main>

			<footer className="py-4 text-center text-xs text-muted-foreground">
				© {new Date().getFullYear()} DevCollab. Built for teams.
			</footer>
		</div>
	);
}
