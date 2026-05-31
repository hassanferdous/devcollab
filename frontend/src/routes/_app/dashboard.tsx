import { createFileRoute, Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Clock,
  FolderKanban,
  Plus,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { AppHeader } from '~/components/layout/app-header'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { projectsQueryOptions, useProjects } from '~/queries/use-projects'
import { useAuthStore } from '~/stores/auth'
import type { Project } from '~/types'

export const Route = createFileRoute('/_app/dashboard')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(projectsQueryOptions),
  component: DashboardPage,
})

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  description?: string
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`rounded-xl p-2.5 ${color}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentProjectCard({ project }: { project: Project }) {
  return (
    <Link to="/projects/$projectId" params={{ projectId: String(project.id) }}>
      <div className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderKanban className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
            {project.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {project.description ?? 'No description'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            project.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {project.status}
        </span>
      </div>
    </Link>
  )
}

function DashboardPage() {
  const { user } = useAuthStore()
  const { data: projects, isLoading } = useProjects()

  const projectList = projects ?? []
  const activeProjects = projectList.filter((p: Project) => p.status === 'active').length
  const archivedProjects = projectList.filter((p: Project) => p.status === 'archived').length

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <>
      <AppHeader
        title="Dashboard"
        actions={
          <Button asChild size="sm">
            <Link to="/projects">
              <Plus className="size-4" />
              New project
            </Link>
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="mt-1 text-muted-foreground">
            Here's what's happening with your projects.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={FolderKanban}
              label="Total projects"
              value={projectList.length}
              description="All time"
              color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Active projects"
              value={activeProjects}
              description="Currently in progress"
              color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            />
            <StatCard
              icon={Timer}
              label="Archived"
              value={archivedProjects}
              description="Completed or on hold"
              color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            />
            <StatCard
              icon={CheckCircle2}
              label="As admin"
              value={projectList.filter((p: Project) => p.role === 'admin').length}
              description="Projects you manage"
              color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            />
          </div>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Recent projects</CardTitle>
              <CardDescription>Your most recently active projects</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/projects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : projectList.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <FolderKanban className="size-10 text-muted-foreground/40" />
                <div className="text-center">
                  <p className="text-sm font-medium">No projects yet</p>
                  <p className="text-xs text-muted-foreground">
                    Create your first project to get started
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link to="/projects">
                    <Plus className="size-4" />
                    Create project
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {projectList.slice(0, 5).map((project: Project) => (
                  <RecentProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
