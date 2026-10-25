import { setupWorker } from 'msw/browser'
import { expireQuotes } from './commerce'
import { initDb, resetDb } from './db'
import { handlers } from './handlers'
import { publishStaleNftUpdate, updateNft, type NftChanges } from './nft-updates'
import { resumePendingOrders, settlePendingOrders } from './orders'
import { dropConnections, replayLastEvent } from './realtime'
import { getScenarioName, setScenarioName } from './scenarios'
import { expireAllSessions } from './utils'

export const worker = setupWorker(...handlers)

type ReceivedEvent = { event: string; payload: unknown; at: string }

/**
 * Test probe: every event the app's socket.io-client receives, whatever the
 * user or connection. It lives only in the mock build and only observes, so
 * tests can prove an event did NOT reach the client (e.g. after a user switch).
 */
const receivedEvents: ReceivedEvent[] = []

declare global {
  interface Window {
    /** Mock controls for manual testing and Playwright. */
    __kurioMock?: {
      reset: () => Promise<void>
      setScenario: (name: string) => void
      getScenario: () => string
      expireSessions: () => void
      updateNft: (nftId: string, changes: NftChanges) => void
      dropConnections: () => void
      replayLastEvent: () => void
      emitStaleNftUpdate: (nftId: string, price: string) => void
      settlePendingOrders: () => void
      expireQuotes: () => void
      receivedEvents: () => ReceivedEvent[]
    }
  }
}

/**
 * Applies `?scenario=<name>` and `?mock-reset` from the URL, loads the mock
 * database and starts the worker. Control params are removed from the URL so
 * they never leak into the app's router state.
 */
export async function startMocking() {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  const shouldReset = url.searchParams.has('mock-reset')

  if (scenario) {
    try {
      setScenarioName(scenario)
    } catch (error) {
      console.warn(`[mocks] ${(error as Error).message}, keeping "${getScenarioName()}"`)
    }
  }
  if (shouldReset) await resetDb()
  else await initDb()
  // Payments left pending by a reload settle at their persisted deadline.
  resumePendingOrders()

  if (scenario || shouldReset) {
    url.searchParams.delete('scenario')
    url.searchParams.delete('mock-reset')
    window.history.replaceState(window.history.state, '', url)
  }

  window.__kurioMock = {
    reset: resetDb,
    setScenario: setScenarioName,
    getScenario: getScenarioName,
    expireSessions: expireAllSessions,
    updateNft,
    dropConnections,
    replayLastEvent,
    emitStaleNftUpdate: publishStaleNftUpdate,
    settlePendingOrders,
    expireQuotes,
    receivedEvents: () => structuredClone(receivedEvents),
  }

  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })

  // Loaded only now: engine.io-client keeps the WebSocket constructor it finds
  // when its module is evaluated, and only after start() is it MSW's.
  const { socket } = await import('@/realtime/socket')
  socket.onAny((event: string, payload: unknown) => {
    receivedEvents.push({ event, payload, at: new Date().toISOString() })
  })
}
