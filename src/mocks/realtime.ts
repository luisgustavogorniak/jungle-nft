import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { db } from './db'

// The client connects to the page origin (ws://localhost, wss://*.vercel.app).
// MSW strips the "/socket.io/" path itself, so the link targets the origin only.
export const realtime = ws.link(window.location.origin.replace(/^http/, 'ws'))

// The binding fakes the Engine.IO handshake (pingInterval 25s, pingTimeout 5s)
// but never sends pings, so the client would drop the connection every ~30s.
// Sending the raw Engine.IO ping packet ("2") keeps it alive.
const HEARTBEAT_MS = 20_000

type Connection = { userId: string | null; io: ReturnType<typeof toSocketIo> }
const connections = new Set<Connection>()

/**
 * The client sends its auth payload in the Socket.IO CONNECT packet
 * (`40{"token":"..."}`). The binding has no rooms, so the user is resolved
 * here and kept on the connection to scope private events.
 */
function userIdFromConnectPacket(raw: string): string | null {
  try {
    const { token } = JSON.parse(raw.slice(2)) as { token?: string | null }
    const session = db().sessions.find((candidate) => candidate.token === token)
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null
    return session.userId
  } catch {
    return null
  }
}

/** Private events reach only the sockets authenticated as this user. */
export function emitToUser(userId: string, event: string, payload: unknown) {
  for (const connection of connections) {
    if (connection.userId === userId) connection.io.client.emit(event, payload)
  }
}

/** Public events (catalog changes) reach every connected client. */
export function broadcast(event: string, payload: unknown) {
  for (const connection of connections) connection.io.client.emit(event, payload)
}

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    const entry: Connection = { userId: null, io: toSocketIo(connection) }
    connections.add(entry)

    connection.client.addEventListener('message', (event) => {
      if (typeof event.data === 'string' && event.data.startsWith('40')) {
        entry.userId = userIdFromConnectPacket(event.data)
      }
    })

    const heartbeat = setInterval(() => connection.client.send('2'), HEARTBEAT_MS)
    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      connections.delete(entry)
    })
  }),
]
