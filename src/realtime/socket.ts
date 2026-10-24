import { io } from 'socket.io-client'
import { getToken } from '@/api/credentials'

// WebSocket only: the MSW binding intercepts WebSocket, not HTTP long-polling.
// `auth` is a function, so every (re)connection sends the current token.
export const socket = io({
  transports: ['websocket'],
  autoConnect: false,
  auth: (callback) => callback({ token: getToken() }),
})
