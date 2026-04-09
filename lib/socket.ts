import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket && typeof window !== 'undefined') {
    socket = io(process.env.NEXT_PUBLIC_BOT_URL!, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socket.on('connect', () => {
      console.log('🔌 Socket conectado:', socket?.id)
    })

    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado')
    })

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket error:', err.message)
    })
  }
  return socket!
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
