import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { Calendar, GripVertical } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Card, CardContent } from '~/components/ui/card'
import type { ProjectMember, Task } from '~/types'
import { cn } from '~/lib/utils'

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: {
    label: 'Low',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface TaskCardProps {
  task: Task
  canEdit: boolean
  members: ProjectMember[]
  onOpen: () => void
}

export function TaskCard({ task, canEdit, members, onOpen }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !canEdit })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  }

  const priority = priorityConfig[task.priority] ?? priorityConfig.low
  const creator = members.find((m) => m.user_id === task.created_by)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'select-none bg-card transition-shadow cursor-pointer',
        canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging
          ? 'opacity-40 shadow-xl ring-2 ring-primary/30'
          : 'shadow-sm hover:shadow-md hover:border-primary/20',
      )}
      onClick={onOpen}
      {...(canEdit ? { ...attributes, ...listeners } : {})}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-1.5">
          {canEdit && (
            <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/30 pointer-events-none" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            {task.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {task.description}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    priority.className,
                  )}
                >
                  {priority.label}
                </span>
                {task.due_date && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="size-2.5" />
                    {format(new Date(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>

              {creator?.user && (
                <Avatar className="size-5 shrink-0 ring-1 ring-background">
                  <AvatarImage src={creator.user.avatar ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(creator.user.name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
