'use client'

import { useEffect, useRef } from 'react'
import { getSocket } from '@/lib/socket'
import type { Socket } from 'socket.io-client'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = getSocket()
    return () => {}
  }, [])

  return socketRef.current ?? getSocket()
}
