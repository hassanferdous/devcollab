import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./components/providers/query-provider";

export function getRouter() {
	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		scrollRestoration: true,
		context: {
			auth: undefined!,
			queryClient: queryClient,
		},
	});
	return router;
}
