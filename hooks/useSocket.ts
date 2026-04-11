'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSocket } from '@/lib/socket'
import type { Socket } from 'socket.io-client'

export function useSocket() {
  const { getToken } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    let isMounted = true

    getToken()
      .then(token => {
        if (!isMounted || !token) return
        setSocket(getSocket(token))
      })
      .catch(console.error)

    return () => {
      isMounted = false
    }
  }, [getToken])

  return socket
}
