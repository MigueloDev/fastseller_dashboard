import type { Conversation, Message } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_BOT_URL

async function request<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  getConversations: (token: string) =>
    request<Conversation[]>('/conversations', token),

  getMessages: (token: string, jid: string) =>
    request<Message[]>(
      `/conversations/${encodeURIComponent(jid)}/messages`,
      token
    ),

  updateStatus: (token: string, jid: string, status: string) =>
    request(`/conversations/${encodeURIComponent(jid)}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  sendMessage: (token: string, jid: string, text: string) =>
    request('/send', token, {
      method: 'POST',
      body: JSON.stringify({ jid, text }),
    }),
}
