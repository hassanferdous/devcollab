import { createFileRoute } from '@tanstack/react-router'
import { FolderKanban, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ProjectCard } from '~/components/project/project-card'
import { ProjectForm } from '~/components/project/project-form'
import { AppHeader } from '~/components/layout/app-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from '~/hooks/use-projects'
import type { CreateProjectFormData, Project } from '~/types'

export const Route = createFileRoute('/_app/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteProject, setDeleteProject] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')

  const { data: projects, isLoading } = useProjects()
  const { mutate: createProject, isPending: isCreating } = useCreateProject()
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject(
    editProject?.id ?? 0
  )
  const { mutate: deleteProj, isPending: isDeleting } = useDeleteProject()

  const filtered = (projects ?? []).filter((p: Project) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreate = (data: CreateProjectFormData) => {
    createProject(data, {
      onSuccess: () => {
        setCreateOpen(false)
        toast.success('Project created!')
      },
      onError: () => toast.error('Failed to create project'),
    })
  }

  const handleUpdate = (data: CreateProjectFormData) => {
    if (!editProject) return
    updateProject(data, {
      onSuccess: () => {
        setEditProject(null)
        toast.success('Project updated!')
      },
      onError: () => toast.error('Failed to update project'),
    })
  }

  const handleDelete = () => {
    if (!deleteProject) return
    deleteProj(deleteProject.id, {
      onSuccess: () => {
        setDeleteProject(null)
        toast.success('Project deleted')
      },
      onError: () => toast.error('Failed to delete project'),
    })
  }

  return (
    <>
      <AppHeader
        title="Projects"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New project
          </Button>
        }
      />

      <div className="flex-1 space-y-5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-8"
            />
          </div>
          <Tabs
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as 'all' | 'active' | 'archived')
            }
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <FolderKanban className="size-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="font-medium">
                {search || statusFilter !== 'all'
                  ? 'No matching projects'
                  : 'No projects yet'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first project to get started'}
              </p>
            </div>
            {!search && statusFilter === 'all' && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Create project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project: Project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={setEditProject}
                onDelete={setDeleteProject}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new project</DialogTitle>
          </DialogHeader>
          <ProjectForm onSubmit={handleCreate} isPending={isCreating} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProject} onOpenChange={(o) => !o && setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          {editProject && (
            <ProjectForm
              defaultValues={editProject}
              onSubmit={handleUpdate}
              isPending={isUpdating}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteProject}
        onOpenChange={(o) => !o && setDeleteProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteProject?.name}
              </span>{' '}
              and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
