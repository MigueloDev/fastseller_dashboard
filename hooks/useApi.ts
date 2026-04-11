'use client'

import { useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'

export function useApi() {
  const { getToken } = useAuth()

  const withToken = useCallback(async <T,>(
    fn: (token: string) => Promise<T>
  ): Promise<T> => {
    const token = await getToken()

    if (!token) {
      throw new Error('No autenticado')
    }

    return fn(token)
  }, [getToken])

  return useMemo(() => ({
    getConversations: () =>
      withToken(token => api.getConversations(token)),

    getMessages: (jid: string) =>
      withToken(token => api.getMessages(token, jid)),

    updateStatus: (jid: string, status: string) =>
      withToken(token => api.updateStatus(token, jid, status)),

    sendMessage: (jid: string, text: string) =>
      withToken(token => api.sendMessage(token, jid, text)),
  }), [withToken])
}
