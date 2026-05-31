import { createServerFn } from "@tanstack/react-start";
import { authApi } from "~/lib/api/auth";

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
	const user = await authApi.me();
	return user.data;
});
