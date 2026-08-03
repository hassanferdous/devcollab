export type NotificationType = 'comment_mention'

export interface NotificationActor {
  id: number
  name: string | null
  avatar: string | null
}

export interface AppNotification {
  id: number
  type: NotificationType
  actor: NotificationActor | null
  project_id: number | null
  task_id: number | null
  comment_id: number | null
  preview: string | null
  is_read: boolean
  created_at: string
}

/** Live `notification:new` socket payload. */
export interface NotificationNewPayload {
  notification: AppNotification
  unreadCount: number
}
