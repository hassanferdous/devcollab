import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Users } from 'lucide-react'
import { useState } from 'react'
import { KanbanBoard } from '~/components/task/kanban-board'
import { ProjectMembers } from '~/components/project/project-members'
import { AppHeader } from '~/components/layout/app-header'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { useAuthStore } from '~/stores/auth'
import type { MemberRole, ProjectMember, Task } from '~/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { useProject } from '~/hooks/use-projects'
import { useTasks } from '~/hooks/use-tasks'

export const Route = createFileRoute('/_app/projects/$projectId/')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const id = parseInt(projectId)
  const [membersOpen, setMembersOpen] = useState(false)

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: tasksData, isLoading: tasksLoading } = useTasks(id)
  const { user } = useAuthStore()

  const tasks = tasksData?.data ?? []

  const taskCounts = {
    pending: tasks.filter((t: Task) => t.status === 'pending').length,
    in_progress: tasks.filter((t: Task) => t.status === 'in_progress').length,
    completed: tasks.filter((t: Task) => t.status === 'completed').length,
  }

  if (projectLoading) {
    return (
      <>
        <AppHeader />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-4 mt-6">
            <Skeleton className="h-[500px] w-72 rounded-xl" />
            <Skeleton className="h-[500px] w-72 rounded-xl" />
            <Skeleton className="h-[500px] w-72 rounded-xl" />
          </div>
        </div>
      </>
    )
  }

  if (!project) {
    return (
      <>
        <AppHeader />
        <div className="flex flex-col items-center gap-4 p-20">
          <p className="text-muted-foreground">Project not found</p>
          <Button variant="outline" asChild>
            <Link to="/projects">
              <ArrowLeft className="size-4" />
              Back to projects
            </Link>
          </Button>
        </div>
      </>
    )
  }

  const members: ProjectMember[] = project.members ?? []

  // project.role is only populated from the list endpoint; derive it from members for detail view
  const userMember = members.find((m) => m.user_id === user?.id)
  const effectiveRole = (project.role ?? userMember?.role) as MemberRole | undefined

  const canManage = effectiveRole === 'admin'

  return (
    <>
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
        <div className="border-b px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">{project.name}</h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
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

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-slate-400" />
              {taskCounts.pending} to do
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-400" />
              {taskCounts.in_progress} in progress
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-green-400" />
              {taskCounts.completed} completed
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {tasksLoading ? (
            <div className="flex gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-72 rounded-xl" />
              ))}
            </div>
          ) : (
            <KanbanBoard
              projectId={id}
              tasks={tasks}
              members={members}
              userRole={effectiveRole}
            />
          )}
        </div>
      </div>
    </>
  )
}
