'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { IntentBadge } from './IntentBadge'
import type {
  Conversation,
  IntentDetectedEvent,
  ConversationUpdatedEvent,
  IntentType,
} from '@/types'
import clsx from 'clsx'

function formatPhone(jid: string) {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

function formatTime(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_COLORS: Record<string, string> = {
  bot: 'bg-gray-200 text-gray-600',
  human: 'bg-blue-100 text-blue-700',
  closed: 'bg-green-100 text-green-700',
}

export function ConversationList() {
  const router = useRouter()
  const pathname = usePathname()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [alerts, setAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.getConversations()
      .then(setConversations)
      .catch(console.error)
  }, [])

  useEffect(() => {
    const socket = getSocket()

    socket.on('conversation_updated', (event: ConversationUpdatedEvent) => {
      setConversations(prev => {
        const exists = prev.find(c => c.jid === event.jid)
        if (exists) {
          return prev
            .map(c => c.jid === event.jid
              ? { ...c, lastMessageAt: event.lastMessageAt }
              : c
            )
            .sort((a, b) =>
              new Date(b.lastMessageAt ?? 0).getTime() -
              new Date(a.lastMessageAt ?? 0).getTime()
            )
        }
        // Conversación nueva — recargar lista
        api.getConversations().then(setConversations).catch(console.error)
        return prev
      })
    })

    socket.on('intent_detected', (event: IntentDetectedEvent) => {
      setAlerts(prev => new Set([...prev, event.jid]))
    })

    return () => {
      socket.off('conversation_updated')
      socket.off('intent_detected')
    }
  }, [])

  function handleClick(jid: string) {
    setAlerts(prev => {
      const next = new Set(prev)
      next.delete(jid)
      return next
    })
    router.push(`/inbox/${encodeURIComponent(jid)}`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 && (
        <div className="p-4 text-center text-gray-400 text-sm">
          Sin conversaciones aún
        </div>
      )}
      {conversations.map(conv => {
        const isActive = pathname === `/inbox/${encodeURIComponent(conv.jid)}`
        const hasAlert = alerts.has(conv.jid)
        const lastMsg = conv.messages?.[0]

        return (
          <button
            key={conv.id}
            onClick={() => handleClick(conv.jid)}
            className={clsx(
              'w-full text-left px-4 py-3 border-b border-gray-100',
              'hover:bg-gray-50 transition-colors',
              isActive && 'bg-blue-50 border-l-2 border-l-blue-500',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-gray-800">
                {formatPhone(conv.jid)}
              </span>
              <span className="text-xs text-gray-400">
                {formatTime(conv.lastMessageAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500 truncate flex-1">
                {lastMsg?.text ?? 'Sin mensajes'}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <span className={clsx(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  STATUS_COLORS[conv.status],
                )}>
                  {conv.status}
                </span>
                {hasAlert && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
