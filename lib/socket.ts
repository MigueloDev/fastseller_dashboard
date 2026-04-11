import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let socketToken: string | null = null

function createSocket(token: string): Socket {
  const nextSocket = io(process.env.NEXT_PUBLIC_BOT_URL!, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: {
      token,
    },
  })

  nextSocket.on('connect', () => {
    console.log('🔌 Socket conectado:', nextSocket.id)
  })

  nextSocket.on('disconnect', () => {
    console.log('🔌 Socket desconectado')
  })

  nextSocket.on('connect_error', (err) => {
    console.error('🔌 Socket error:', err.message)
  })

  return nextSocket
}

export function getSocket(token?: string): Socket {
  if (typeof window === 'undefined') {
    throw new Error('Socket solo disponible en el navegador')
  }

  if (!socket) {
    if (!token) {
      throw new Error('Socket token required before initialization')
    }

    socketToken = token
    socket = createSocket(token)
    return socket
  }

  if (token && token !== socketToken) {
    socketToken = token
    socket.auth = {
      ...(typeof socket.auth === 'object' && socket.auth ? socket.auth : {}),
      token,
    }

    if (socket.connected) {
      socket.disconnect()
    }

    socket.connect()
  }

  return socket!
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    socketToken = null
  }
}
