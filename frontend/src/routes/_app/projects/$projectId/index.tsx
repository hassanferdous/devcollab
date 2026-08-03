import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Suspense, useState } from "react";
import { AppHeader } from "~/components/layout/app-header";
import { ProjectAbilityProvider } from "~/components/project/project-ability";
import { ProjectMembers } from "~/components/project/project-members";
import {
	ProjectSlugProvider,
	useProjectContext,
} from "~/components/providers/project-slug-provider";
import { KanbanBoard } from "~/components/task/kanban-board";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	projectQueryOptions,
	useProjectSuspense,
} from "~/queries/use-projects";
import { tasksQueryOptions, useTasks } from "~/queries/use-tasks";
import { useAuthStore } from "~/stores/auth";
import { getInitials } from "~/lib/utils";
import type { MemberRole, ProjectMember, Task } from "~/types";

export const Route = createFileRoute("/_app/projects/$projectId/")({
	loader: async ({ context: { queryClient }, params }) => {
		const id = Number(params.projectId);
		const data = Promise.all([
			queryClient.prefetchQuery(projectQueryOptions(id)),
			queryClient.prefetchQuery(tasksQueryOptions(id)),
		]);

		return data;
	},
	pendingMs: 0,
	pendingComponent: ProjectDetailSkeleton,
	component: ProjectDetailPage,
});

function ProjectDetailSkeleton() {
	return (
		<>
			<AppHeader />
			<div className="flex flex-1 flex-col overflow-hidden">
				<div className="border-b border-border px-6 py-4 space-y-3">
					<div className="flex items-center gap-2">
						<Skeleton className="h-7 w-52" />
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
					<Skeleton className="h-4 w-80" />
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-20" />
					</div>
				</div>
				<div className="flex-1 overflow-auto p-6">
					<div className="flex gap-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex flex-col gap-3 w-72 shrink-0">
								<Skeleton className="h-8 w-full rounded-lg" />
								{Array.from({ length: 6 }).map((_, j) => (
									<Skeleton
										key={j}
										className="h-24 w-full rounded-xl"
									/>
								))}
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}

function TaskCountsSkeleton() {
	return (
		<div className="mt-3 flex items-center gap-4">
			<Skeleton className="h-4 w-14" />
			<Skeleton className="h-4 w-20" />
			<Skeleton className="h-4 w-18" />
		</div>
	);
}

function KanbanSkeleton() {
	return (
		<div className="flex gap-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className="flex flex-col gap-3 w-72 shrink-0">
					<Skeleton className="h-8 w-full rounded-lg" />
					{Array.from({ length: 6 }).map((_, j) => (
						<Skeleton key={j} className="h-24 w-full rounded-xl" />
					))}
				</div>
			))}
		</div>
	);
}

function TaskCounts({ projectId }: { projectId: number }) {
	const { data: tasksData } = useTasks(projectId);
	const tasks = tasksData?.data ?? [];
	return (
		<div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
			<span className="flex items-center gap-1">
				<span className="size-2 rounded-full bg-slate-400" />
				{tasks.filter((t: Task) => t.status === "pending").length} to do
			</span>
			<span className="flex items-center gap-1">
				<span className="size-2 rounded-full bg-blue-400" />
				{tasks.filter((t: Task) => t.status === "in_progress").length} in
				progress
			</span>
			<span className="flex items-center gap-1">
				<span className="size-2 rounded-full bg-green-400" />
				{tasks.filter((t: Task) => t.status === "completed").length}{" "}
				completed
			</span>
		</div>
	);
}

function OnlineAvatars() {
	const { onlineUsers } = useProjectContext();
	if (onlineUsers.length === 0) return null;

	const visible = onlineUsers.slice(0, 5);
	const overflow = onlineUsers.length - visible.length;

	return (
		<div className="flex items-center gap-1.5">
			<span className="relative flex size-2">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
				<span className="relative inline-flex size-2 rounded-full bg-green-500" />
			</span>
			<div className="flex items-center">
				{visible.map((u) => (
					<Tooltip key={u.id}>
						<TooltipTrigger asChild>
							<div className="not-first:-ml-2 cursor-default">
								<Avatar className="size-7 ring-2 ring-background">
									<AvatarImage src={u.avatar ?? undefined} />
									<AvatarFallback className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
										{getInitials(u.name)}
									</AvatarFallback>
								</Avatar>
							</div>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							{u.name ?? u.email}
						</TooltipContent>
					</Tooltip>
				))}
				{overflow > 0 && (
					<div className="-ml-2 flex size-7 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[10px] font-medium text-muted-foreground">
						+{overflow}
					</div>
				)}
			</div>
			<span className="text-xs text-muted-foreground hidden sm:inline">
				{onlineUsers.length} online
			</span>
		</div>
	);
}

function KanbanSection() {
	const { slug } = useProjectContext();
	const { data: tasksData } = useTasks(Number(slug));
	const tasks = tasksData?.data ?? [];
	return <KanbanBoard tasks={tasks} />;
}

function ProjectDetailPage() {
	const { projectId } = Route.useParams();
	const id = parseInt(projectId);
	const [membersOpen, setMembersOpen] = useState(false);

	const { data: project, isSuccess } = useProjectSuspense(id);
	const { user } = useAuthStore();

	const members: ProjectMember[] = project?.members ?? [];
	const userMember = members.find((m) => m.user_id === user?.id);
	const effectiveRole = (project?.role ?? userMember?.role) as
		| MemberRole
		| undefined;
	const canManage = effectiveRole === "admin";

	return (
		<ProjectSlugProvider
			slug={id}
			project={project}
			effectiveRole={effectiveRole}
			members={members}>
			<ProjectAbilityProvider>
				<AppHeader
					actions={
						<>
							<OnlineAvatars />
							<Sheet open={membersOpen} onOpenChange={setMembersOpen}>
								<SheetTrigger asChild>
									<Button variant="outline" size="sm">
										<Users className="size-4" />
										Members ({members.length})
									</Button>
								</SheetTrigger>
								<SheetContent className="w-[400px] sm:w-[480px]">
									<SheetHeader>
										<SheetTitle>Project members</SheetTitle>
									</SheetHeader>
									<div className="flex-1 overflow-y-auto px-4 pb-4">
										<ProjectMembers
											projectId={id}
											members={members}
											canManage={canManage}
										/>
									</div>
								</SheetContent>
							</Sheet>
						</>
					}
				/>

				<div className="flex flex-1 flex-col overflow-hidden">
					<div className="border-b border-border px-6 py-4">
						<div className="flex items-start gap-3">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<h1 className="text-xl font-bold truncate">
										{project.name}
									</h1>
									<span
										className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
											project.status === "active"
												? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
												: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
										}`}>
										{project.status}
									</span>
									{effectiveRole && (
										<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
											{effectiveRole}
										</span>
									)}
								</div>
								{project.description && (
									<p className="mt-1 text-sm text-muted-foreground">
										{project.description}
									</p>
								)}
							</div>
						</div>

						<Suspense fallback={<TaskCountsSkeleton />}>
							<TaskCounts projectId={id} />
						</Suspense>
					</div>

					<div className="flex-1 overflow-auto py-4 px-6">
						<Suspense fallback={<KanbanSkeleton />}>
							<KanbanSection />
						</Suspense>
					</div>
				</div>
			</ProjectAbilityProvider>
		</ProjectSlugProvider>
	);
}
