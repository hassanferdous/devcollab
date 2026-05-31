import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	FolderKanban,
	Home,
	Users,
	Zap,
} from "lucide-react";
import { ThemeToggle } from "~/components/layout/theme-toggle";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

const features = [
	{
		icon: FolderKanban,
		title: "Kanban Boards",
		description:
			"Visualize your workflow with drag-and-drop kanban boards. Move tasks across pending, in-progress, and completed columns with ease.",
	},
	{
		icon: Zap,
		title: "Real-time Updates",
		description:
			"Changes sync instantly across all team members via WebSockets. Everyone sees the latest state without refreshing.",
	},
	{
		icon: Users,
		title: "Team Collaboration",
		description:
			"Invite teammates with granular roles — admin, member, or viewer. Manage access per project to keep work organized.",
	},
];

function LandingPage() {
	return (
		<div className="flex min-h-svh flex-col">
			{/* Navbar */}
			<header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
					<div className="flex items-center gap-2">
						<div className="flex size-7 items-center justify-center rounded-lg bg-primary">
							<Home className="size-3.5 text-primary-foreground" />
						</div>
						<span className="text-sm font-semibold">DevCollab</span>
					</div>

					<div className="flex items-center gap-2">
						<ThemeToggle />
						<Button variant="ghost" size="sm" asChild>
							<Link to="/login">Sign in</Link>
						</Button>
						<Button size="sm" asChild>
							<Link to="/register">Get started</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="flex flex-1 flex-col">
				{/* Hero */}
				<section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center">
					<Badge variant="secondary" className="gap-1.5">
						<Zap className="size-3" />
						Real-time collaboration
					</Badge>

					<h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
						Project management built for{" "}
						<span className="text-primary">dev teams</span>
					</h1>

					<p className="max-w-xl text-base text-muted-foreground sm:text-lg">
						Organize work with kanban boards, collaborate in real time, and ship
						faster — all in one focused tool.
					</p>

					<div className="flex flex-wrap items-center justify-center gap-3">
						<Button size="lg" asChild>
							<Link to="/register">
								Start for free
								<ArrowRight />
							</Link>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<Link to="/login">Sign in</Link>
						</Button>
					</div>
				</section>

				<Separator />

				{/* Features */}
				<section className="mx-auto w-full max-w-5xl px-6 py-20">
					<div className="mb-12 text-center">
						<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							Everything your team needs
						</h2>
						<p className="mt-2 text-muted-foreground">
							Simple, powerful tools that get out of the way.
						</p>
					</div>

					<div className="grid gap-5 sm:grid-cols-3">
						{features.map(({ icon: Icon, title, description }) => (
							<Card key={title} className="border-border/60">
								<CardContent className="flex flex-col gap-3 p-6">
									<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
										<Icon className="size-5 text-primary" />
									</div>
									<h3 className="font-semibold">{title}</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{description}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</section>

				{/* CTA banner */}
				<section className="mx-auto w-full max-w-5xl px-6 pb-20">
					<div className="flex flex-col items-center gap-4 rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground">
						<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							Ready to ship faster?
						</h2>
						<p className="max-w-md text-sm opacity-80 sm:text-base">
							Create your free account and invite your team in under a minute.
						</p>
						<Button
							size="lg"
							variant="secondary"
							className="mt-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
							asChild
						>
							<Link to="/register">
								Create free account
								<ArrowRight />
							</Link>
						</Button>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
				© {new Date().getFullYear()} DevCollab. Built for teams.
			</footer>
		</div>
	);
}
