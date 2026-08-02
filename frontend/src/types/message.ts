export interface MessageSender {
  id: number
  name: string | null
  avatar: string | null
}

export interface Message {
  id: number
  project_id: number
  sender_id: number
  content: string
  is_edited: boolean
  created_at: string
  updated_at: string
  sender: MessageSender | null
}

/** Live `message:new` broadcast payload: a persisted message plus the echoed clientId. */
export interface MessageNewPayload extends Message {
  clientId?: string
}

/**
 * A message as held in the query cache. Extends {@link Message} with optimistic
 * bookkeeping: `clientId` reconciles the pending row with its `message:new` echo,
 * `pending`/`failed` drive the "sending…" / "failed" UI states.
 */
export interface ChatMessage extends Message {
  clientId?: string
  pending?: boolean
  failed?: boolean
}

/** Ephemeral typing indicator entry, keyed by user id. */
export interface TypingUser {
  userId: number
}
