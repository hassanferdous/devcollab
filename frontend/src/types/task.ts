export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  position: number
  project_id: number
  created_by: number
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface TaskAssignee {
  user_id: number
  name: string | null
  email: string
  avatar: string | null
  assigned_at: string | null
}

export interface TaskActivityLog {
  id: number
  task_id: number
  user_id: number | null
  action: 'created' | 'updated' | 'deleted'
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export interface TaskActivity extends TaskActivityLog {
  actor: { id: number; name: string | null; avatar: string | null } | null
}

export interface CreateTaskFormData {
  title: string
  description: string
  priority: TaskPriority
  start_date?: string
  due_date?: string
}

export interface UpdateTaskFormData {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  start_date?: string
  due_date?: string
}

export interface TaskCreatedPayload extends Task {}
export interface TaskUpdatedPayload extends Task {}
export interface TaskDeletedPayload extends Task {}
export interface TaskReorderedPayload {
  status: TaskStatus
  task_ids: number[]
}
export interface ProjectJoinedPayload {
  projectId: number
  userId: number
}
