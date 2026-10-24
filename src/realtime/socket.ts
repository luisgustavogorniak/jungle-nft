import { io } from 'socket.io-client'

// WebSocket only: the MSW binding intercepts WebSocket, not HTTP long-polling.
export const socket = io({
  transports: ['websocket'],
  autoConnect: false,
})
