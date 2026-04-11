'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { useSocket } from '@/hooks/useSocket'
import { MessageBubble } from './MessageBubble'
import { StatusBadge } from './StatusBadge'
import { formatPhone } from '@/lib/format'
import type { Message, Conversation } from '@/types'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, ArrowLeft } from 'lucide-react'

interface Props {
  jid: string
}

function getInitials(jid: string): string {
  const phone = formatPhone(jid)
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-2)
}

function groupByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = []
  let currentLabel = ''

  for (const msg of messages) {
    const d = new Date(msg.createdAt)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const label = isToday
      ? 'Hoy'
      : isYesterday
      ? 'Ayer'
      : d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }

  return groups
}

export function ChatWindow({ jid }: Props) {
  const api = useApi()
  const socket = useSocket()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.getMessages(jid)
      .then(setMessages)
      .catch(console.error)

    api.getConversations()
      .then(convs => {
        const conv = convs.find(c => c.jid === jid)
        if (conv) setConversation(conv)
      })
      .catch(console.error)
  }, [api, jid])

  useEffect(() => {
    if (!socket) return

    socket.emit('join_conversation', jid)

    socket.on('new_message', (msg: Message & { jid: string }) => {
      if (msg.jid !== jid) return
      setMessages(prev => [...prev, msg])
    })

    return () => {
      socket.emit('leave_conversation', jid)
      socket.off('new_message')
    }
  }, [jid, socket])

  useEffect(() => {
    /* bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) */
  }, [messages])

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await api.sendMessage(jid, input.trim())
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err)
    } finally {
      setSending(false)
    }
  }

  async function handleTakeControl() {
    await api.updateStatus(jid, 'human')
    setConversation(prev => prev ? { ...prev, status: 'human' } : prev)
  }

  async function handleResumeBot() {
    await api.updateStatus(jid, 'bot')
    setConversation(prev => prev ? { ...prev, status: 'bot' } : prev)
  }

  async function handleClose() {
    await api.updateStatus(jid, 'closed')
    setConversation(prev => prev ? { ...prev, status: 'closed' } : prev)
  }

  const canReply = conversation?.status === 'human'
  const phone = formatPhone(jid)
  const initials = getInitials(jid)
  const groups = groupByDate(messages)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-3 md:px-4 py-2 md:py-3 bg-white border-b border-gray-200 flex items-center
        justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.1)] z-10">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/inbox')}
            className="md:hidden shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <Avatar className="bg-violet-100 shrink-0 hidden sm:flex">
            <AvatarFallback className="text-violet-700 text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-none">{phone}</span>
              <StatusBadge status={conversation?.status ?? 'bot'} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {conversation?.status === 'bot' && (
            <Button size="sm" onClick={handleTakeControl} className="text-xs md:text-sm">Tomar control</Button>
          )}
          {conversation?.status === 'human' && (
            <>
              <Button variant="secondary" size="sm" onClick={handleResumeBot} className="text-xs md:text-sm">Reanudar bot</Button>
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs md:text-sm">Cerrar</Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-hidden bg-[#f9fafb]">
        <div className="p-4 flex flex-col gap-2">
          {groups.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 px-2">{group.label}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="flex flex-col gap-2">
                {group.messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-3 md:px-4 py-2 md:py-3 bg-white border-t border-gray-200 shrink-0">
        {!canReply && (
          <p className="text-xs text-center text-gray-400 mb-2">
            {conversation?.status === 'closed'
              ? 'Conversación cerrada'
              : 'Toma control para responder manualmente'
            }
          </p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onInput={handleInput}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={!canReply || sending}
              placeholder={canReply ? 'Escribe un mensaje... (Enter para enviar)' : 'Bot en control'}
              rows={1}
              className={clsx(
                'resize-none overflow-hidden min-h-0 px-4 py-5 text-sm',
                canReply ? '' : 'cursor-not-allowed',
              )}
            />
            {input.length > 100 && (
              <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">
                {input.length}
              </span>
            )}
          </div>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canReply || !input.trim() || sending}
            className={clsx(
              'rounded-full shrink-0',
              canReply && input.trim()
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-300',
            )}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
