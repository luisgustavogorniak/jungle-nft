import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'

// The client connects to the page origin (ws://localhost, wss://*.vercel.app).
// MSW strips the "/socket.io/" path itself, so the link targets the origin only.
export const realtime = ws.link(window.location.origin.replace(/^http/, 'ws'))

// The binding fakes the Engine.IO handshake (pingInterval 25s, pingTimeout 5s)
// but never sends pings, so the client would drop the connection every ~30s.
// Sending the raw Engine.IO ping packet ("2") keeps it alive.
const HEARTBEAT_MS = 20_000

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)

    const heartbeat = setInterval(() => connection.client.send('2'), HEARTBEAT_MS)
    connection.client.addEventListener('close', () => clearInterval(heartbeat))

    // Defer until the binding has sent the handshake (it uses queueMicrotask).
    setTimeout(() => io.client.emit('system.ready', { message: 'realtime online' }), 0)
  }),
]
