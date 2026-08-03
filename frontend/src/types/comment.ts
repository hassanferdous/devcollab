export interface CommentSender {
  id: number
  name: string | null
  avatar: string | null
}

export interface Comment {
  id: number
  project_id: number
  task_id: number
  sender_id: number
  content: string
  mentioned_user_ids: number[]
  is_edited: boolean
  created_at: string
  updated_at: string
  sender: CommentSender | null
}

/** Live `comment:new` broadcast payload: a persisted comment plus the echoed clientId. */
export interface CommentNewPayload extends Comment {
  clientId?: string
}

/**
 * A comment as held in the query cache. Extends {@link Comment} with optimistic
 * bookkeeping: `clientId` reconciles the pending row with its `comment:new` echo,
 * `pending`/`failed` drive the "sending…" / "failed" UI states.
 */
export interface CommentItem extends Comment {
  clientId?: string
  pending?: boolean
  failed?: boolean
}
