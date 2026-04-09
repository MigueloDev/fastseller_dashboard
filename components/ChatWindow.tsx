'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { MessageBubble } from './MessageBubble'
import type { Message, Conversation } from '@/types'
import clsx from 'clsx'

interface Props {
  jid: string
}

export function ChatWindow({ jid }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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
  }, [jid])

  useEffect(() => {
    const socket = getSocket()
    socket.emit('join_conversation', jid)

    socket.on('new_message', (msg: Message & { jid: string }) => {
      if (msg.jid !== jid) return
      setMessages(prev => [...prev, msg])
    })

    return () => {
      socket.emit('leave_conversation', jid)
      socket.off('new_message')
    }
  }, [jid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await api.sendMessage(jid, input.trim())
      setInput('')
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

  async function handleClose() {
    await api.updateStatus(jid, 'closed')
    setConversation(prev => prev ? { ...prev, status: 'closed' } : prev)
  }

  const canReply = conversation?.status === 'human'
  const phone = jid.replace('@s.whatsapp.net', '')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-gray-800">{phone}</h2>
          <span className={clsx(
            'text-xs px-2 py-0.5 rounded-full',
            conversation?.status === 'bot' && 'bg-gray-100 text-gray-600',
            conversation?.status === 'human' && 'bg-blue-100 text-blue-700',
            conversation?.status === 'closed' && 'bg-green-100 text-green-700',
          )}>
            {conversation?.status ?? 'bot'}
          </span>
        </div>
        <div className="flex gap-2">
          {conversation?.status === 'bot' && (
            <button
              onClick={handleTakeControl}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Tomar control
            </button>
          )}
          {conversation?.status === 'human' && (
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cerrar conversación
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-gray-50">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        {!canReply && (
          <p className="text-xs text-center text-gray-400 mb-2">
            Toma control de la conversación para responder manualmente
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={!canReply || sending}
            placeholder={canReply ? 'Escribe un mensaje...' : 'Bot en control'}
            className={clsx(
              'flex-1 px-4 py-2 rounded-full border text-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-300',
              canReply
                ? 'border-gray-300 bg-white'
                : 'border-gray-200 bg-gray-100 cursor-not-allowed',
            )}
          />
          <button
            onClick={handleSend}
            disabled={!canReply || !input.trim() || sending}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              canReply && input.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            )}
          >
            {sending ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
