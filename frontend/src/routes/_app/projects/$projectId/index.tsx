import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Suspense, useState } from "react";
import { KanbanBoard } from "~/components/task/kanban-board";
import { ProjectMembers } from "~/components/project/project-members";
import { AppHeader } from "~/components/layout/app-header";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useAuthStore } from "~/stores/auth";
import type { MemberRole, ProjectMember, Task } from "~/types";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import {
	projectQueryOptions,
	useProjectSuspense,
} from "~/queries/use-projects";
import { tasksQueryOptions, useTasks } from "~/queries/use-tasks";
import { ProjectAbilityProvider } from "~/components/project/project-ability";
import {
	ProjectSlugProvider,
	useProjectContext,
} from "~/components/providers/project-slug-provider";
import { number } from "yup";

export const Route = createFileRoute("/_app/projects/$projectId/")({
	loader: async ({ context: { queryClient }, params }) => {
		const id = Number(params.projectId);
		return Promise.all([
			queryClient.prefetchQuery(projectQueryOptions(id)),
			queryClient.prefetchQuery(tasksQueryOptions(id)),
		]);
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

	const { data: project } = useProjectSuspense(id);
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

					<div className="flex-1 overflow-auto p-6">
						<Suspense fallback={<KanbanSkeleton />}>
							<KanbanSection />
						</Suspense>
					</div>
				</div>
			</ProjectAbilityProvider>
		</ProjectSlugProvider>
	);
}
