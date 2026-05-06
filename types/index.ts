export type ConversationStatus = 'bot' | 'human' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageOrigin = 'bot' | 'manual' | 'client'
export type IntentType = 'consulta' | 'intencion' | 'saludo' | 'off_topic' | null

export interface Message {
  id: string
  conversationId: string
  direction: MessageDirection
  text: string
  intent: IntentType
  origin: MessageOrigin | null
  agentName?: string | null
  createdAt: string
  sending?: boolean
  failed?: boolean
}

export interface Conversation {
  id: string
  jid: string
  status: ConversationStatus
  lastMessageAt: string | null
  contactName: string | null
  createdAt: string
  messages?: Message[]
}

export interface NewMessageEvent extends Message {
  jid: string
}

export interface ConversationUpdatedEvent {
  jid: string
  lastMessage: string | null
  lastMessageAt: string
  status: ConversationStatus | null
  intent: IntentType
  updatedBy: string
}

export interface ConversationStatusChangedEvent {
  jid: string
  status: ConversationStatus
  updatedBy: string
}

export interface IntentDetectedEvent {
  jid: string
  text: string
  confidence: number
  reason: string
  timestamp: string
}
