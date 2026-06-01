import * as React from "react";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";

interface AppHeaderProps {
	title?: string;
	actions?: React.ReactNode;
}

export function AppHeader({ title, actions }: AppHeaderProps) {
	return (
		<header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
			<SidebarTrigger />
			<Separator orientation="vertical" />
			{title && <h1 className="text-sm font-semibold">{title}</h1>}
			<div className="ml-auto flex items-center gap-2">
				{actions}
				<ThemeToggle />
			</div>
		</header>
	);
}
