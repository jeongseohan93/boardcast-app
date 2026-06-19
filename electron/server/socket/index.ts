import { Server as SocketIOServer } from 'socket.io'

export function setupSocket(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Client disconnected:', socket.id)
    })
  })
}
