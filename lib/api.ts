import type { Conversation, Message } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_BOT_URL

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  getConversations: () =>
    request<Conversation[]>('/conversations'),

  getMessages: (jid: string) =>
    request<Message[]>(`/conversations/${encodeURIComponent(jid)}/messages`),

  updateStatus: (jid: string, status: string) =>
    request(`/conversations/${encodeURIComponent(jid)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  sendMessage: (jid: string, text: string) =>
    request('/send', {
      method: 'POST',
      body: JSON.stringify({ jid, text }),
    }),
}
