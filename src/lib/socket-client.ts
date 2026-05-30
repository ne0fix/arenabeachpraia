import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      // Limita tentativas para evitar spam no console quando o servidor
      // não suporta WebSocket persistente (ex: Vercel serverless)
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 8000,
    })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
