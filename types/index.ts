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

export interface IntentDetectedEvent {
  jid: string
  text: string
  confidence: number
  reason: string
  timestamp: string
}

export interface ConversationUpdatedEvent {
  jid: string
  intent: IntentType
  lastMessage?: string
  lastMessageAt: string
}
