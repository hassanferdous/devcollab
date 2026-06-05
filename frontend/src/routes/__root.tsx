import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { QueryProvider } from "~/components/providers/query-provider";
import { ThemeProvider } from "~/components/providers/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import type { AuthState } from "~/stores/auth";
import "~/styles/app.css";

interface MyRouterContext {
	auth: AuthState;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "DevCollab — Collaborative Project Management" },
			{
				name: "description",
				content:
					"Real-time collaborative project management with kanban boards",
			},
		],
		links: [{ rel: "icon", href: "/favicon.ico" }],
	}),
	shellComponent: RootDocument,
	notFoundComponent: () => (
		<div className="min-h-screen flex items-center justify-center">
			<h1>404</h1>
		</div>
	),
	errorComponent: ({ error }) => (
		<div className="min-h-screen flex items-center justify-center">
			<h1>{error.message}</h1>
		</div>
	),
});

function RootDocument() {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryProvider>
					<ThemeProvider>
						<TooltipProvider>
							<Outlet />
							<Toaster richColors position="top-right" />
						</TooltipProvider>
					</ThemeProvider>
				</QueryProvider>
				<TanStackRouterDevtools position="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}
