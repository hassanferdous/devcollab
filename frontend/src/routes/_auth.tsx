import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getCookies } from "@tanstack/react-start/server";
import { Home } from "lucide-react";
import { ThemeToggle } from "~/components/layout/theme-toggle";

const authMiddleware = createMiddleware({ type: "request" }).server(
	async ({ next }) => {
		const cookies = getCookies();
		if (cookies.access_token && cookies.refresh_token) {
			throw redirect({ to: "/dashboard" });
		}
		return next({ context: { hasToken: false } });
	},
);

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	server: {
		middleware: [authMiddleware],
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
