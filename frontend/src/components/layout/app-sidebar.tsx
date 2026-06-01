import { Link, useMatchRoute } from "@tanstack/react-router";
import {
	FolderKanban,
	Home,
	LayoutDashboard,
	LogOut,
	User,
} from "lucide-react";
import { useLogout } from "~/queries/use-auth";
import { useAuthStore } from "~/stores/auth";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "~/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

const navItems = [
	{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ title: "Projects", href: "/projects", icon: FolderKanban },
];

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function AppSidebar() {
	const { user } = useAuthStore();
	const { mutate: logout, isPending } = useLogout();
	const matchRoute = useMatchRoute();

	return (
		<Sidebar>
			<SidebarHeader className="h-16 justify-center border-b border-border px-4">
				<Link to="/dashboard" className="flex items-center gap-2.5">
					<div className="flex size-8 items-center justify-center rounded-lg bg-primary">
						<Home className="size-4 text-primary-foreground" />
					</div>
					<span className="text-base font-semibold tracking-tight">
						DevCollab
					</span>
				</Link>
			</SidebarHeader>

			<SidebarContent className="px-2 py-3">
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) => {
								const isActive = !!matchRoute({
									to: item.href,
									fuzzy: true,
								});
								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton asChild isActive={isActive}>
											<Link to={item.href}>
												<item.icon className="size-4" />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="p-3">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="h-auto w-full justify-start gap-3 px-2 py-2">
							<Avatar className="size-8 shrink-0">
								<AvatarImage src={user?.avatar ?? undefined} />
								<AvatarFallback className="text-xs">
									{user?.name ? getInitials(user.name) : "U"}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 text-left">
								<p className="truncate text-sm font-medium">
									{user?.name}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{user?.email}
								</p>
							</div>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-52">
						<DropdownMenuItem asChild>
							<Link to="/profile">
								<User className="size-4" />
								Profile
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => logout()}
							disabled={isPending}
							className="text-destructive focus:text-destructive">
							<LogOut className="size-4" />
							{isPending ? "Signing out..." : "Sign out"}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
