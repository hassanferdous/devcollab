export interface User {
  id: number
  name: string
  email: string
  avatar: string | null
  provider: 'credential' | 'google'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: number
  owner_id: number
  name: string
  description: string | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
  role?: MemberRole
  isMember?: boolean
}

export interface ProjectMember {
  user_id: number
  role: MemberRole
  joined_at: string
  user?: User
}

export interface ProjectWithMembers extends Project {
  members: ProjectMember[]
}

export type MemberRole = 'admin' | 'member' | 'viewer'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  project_id: number
  created_by: number
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskActivityLog {
  id: number
  task_id: number
  user_id: number | null
  action: 'created' | 'updated' | 'deleted'
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export interface PaginationMeta {
  count: number
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  prevPage: number | null
  nextPage: number | null
}

export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  pagination?: PaginationMeta
}

export interface AuthTokens {
  access_token: string
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

export interface RegisterResponse {
  id: number
  email: string
  name: string
  avatar: string | null
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordFormData {
  email: string
}

export interface VerifyOtpFormData {
  email: string
  otp: string
}

export interface ResetPasswordFormData {
  newPassword: string
  confirmPassword: string
  token: string
}

export interface CreateProjectFormData {
  name: string
  description: string
  status: 'active' | 'archived'
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

export interface AddMemberFormData {
  userId: number
  role: MemberRole
}

// Socket event payloads
export interface TaskCreatedPayload extends Task {}
export interface TaskUpdatedPayload extends Task {}
export interface TaskDeletedPayload extends Task {}
export interface ProjectJoinedPayload {
  projectId: number
  userId: number
}
