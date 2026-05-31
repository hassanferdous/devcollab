import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Archive, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import type { Project } from '~/types'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
}

const statusColors = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  member: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const canManage = project.role === 'admin'

  return (
    <Card className="group relative flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight">
              <Link
                to="/projects/$projectId"
                params={{ projectId: String(project.id) }}
                className="hover:text-primary transition-colors"
              >
                {project.name}
              </Link>
            </CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {project.role && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleColors[project.role] ?? ''}`}
              >
                {project.role}
              </span>
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Pencil className="size-4" />
                    Edit project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(project)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {project.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60">
            No description
          </p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[project.status]}`}
        >
          {project.status === 'archived' && <Archive className="size-3" />}
          {project.status}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(new Date(project.created_at), 'MMM d, yyyy')}
        </span>
      </CardFooter>
    </Card>
  )
}
