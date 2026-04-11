'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { useSocket } from '@/hooks/useSocket'
import { StatusBadge } from './StatusBadge'
import { formatPhone, formatTime } from '@/lib/format'
import toast from 'react-hot-toast'
import type {
  Conversation,
  IntentDetectedEvent,
  ConversationUpdatedEvent,
} from '@/types'
import clsx from 'clsx'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { Field } from "@/components/ui/field"
import { Button } from '@base-ui/react'
import { ButtonGroup } from './ui/button-group'

function getInitials(jid: string): string {
  const phone = formatPhone(jid)
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-2)
}

export function ConversationList() {
  const api = useApi()
  const socket = useSocket()
  const router = useRouter()
  const pathname = usePathname()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [alerts, setAlerts] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getConversations()
      .then(setConversations)
      .catch(console.error)
  }, [api])

  useEffect(() => {
    if (!socket) return

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
        api.getConversations().then(setConversations).catch(console.error)
        return prev
      })
    })

    socket.on('intent_detected', (event: IntentDetectedEvent) => {
      setAlerts(prev => new Set([...prev, event.jid]))
      toast('Nueva intención de compra detectada', {
        icon: '🎯',
        style: { borderLeft: '4px solid #dc2626' },
      })
    })

    return () => {
      socket.off('conversation_updated')
      socket.off('intent_detected')
    }
  }, [api, socket])

  function handleClick(jid: string) {
    setAlerts(prev => {
      const next = new Set(prev)
      next.delete(jid)
      return next
    })
    router.push(`/inbox/${encodeURIComponent(jid)}`)
  }

  const alertCount = alerts.size
  const filtered = search.trim()
    ? conversations.filter(c => formatPhone(c.jid).includes(search.trim()))
    : conversations

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Conversaciones</span>
          {alertCount > 0 && (
            <span className="text-xs font-semibold bg-violet-600 text-white px-2 py-0.5 rounded-full">
              {alertCount}
            </span>
          )}
        </div>
        <Field orientation="horizontal">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número..."
            className="w-80% pl-9 h-8 text-sm bg-gray-50 border-gray-200 focus-visible:ring-violet-300" />
          <ButtonGroup>
            <Button>
              <Search className="w-3.5 h-3.5 text-gray-400" />
            </Button>
          </ButtonGroup>
        </Field>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-gray-400 text-xs">
            {search ? 'Sin resultados' : 'Sin conversaciones aún'}
          </div>
        )}
        {filtered.map(conv => {
          const isActive = pathname === `/inbox/${encodeURIComponent(conv.jid)}`
          const hasAlert = alerts.has(conv.jid)
          const lastMsg = conv.messages?.[0]
          const initials = getInitials(conv.jid)
          const displayName = formatPhone(conv.jid)

          return (
            <button
              key={conv.id}
              onClick={() => handleClick(conv.jid)}
              className={clsx(
                'w-full text-left px-3 py-3 flex items-center gap-3',
                'hover:bg-gray-50 transition-colors relative',
                'border-b border-gray-100',
                isActive && 'bg-violet-50 border-l-2 border-l-violet-500 pl-[10px]',
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="bg-violet-100">
                  <AvatarFallback className="text-violet-700 text-sm font-medium">{initials}</AvatarFallback>
                </Avatar>
                {hasAlert && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500
                    rounded-full border-2 border-white animate-pulse" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {displayName}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500 truncate">
                    {lastMsg?.text ?? 'Sin mensajes'}
                  </p>
                  <StatusBadge status={conv.status} />
                </div>
              </div>
            </button>
          )
        })}
      </ScrollArea>
    </div>
  )
}
