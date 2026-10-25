import { setupWorker } from 'msw/browser'
import { http } from '@/api/http'
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
 * Resolves once the Service Worker controlling the page counts this page as an
 * active client. The worker keeps that list only in memory: when the browser
 * stops an idle worker (e.g. a background tab, where MSW's keepalive timer is
 * throttled), the restarted worker has an empty list and sends every request to
 * the network, where the host answers 404/405. `MOCK_ACTIVATE` is idempotent,
 * so it is sent before every request and the request waits for the answer.
 */
function ensureMocking(): Promise<void> {
  const container = navigator.serviceWorker
  return new Promise((resolve) => {
    const activate = (controller: ServiceWorker) => {
      const onMessage = (event: MessageEvent<{ type?: string }>) => {
        if (event.data?.type !== 'MOCKING_ENABLED') return
        container.removeEventListener('message', onMessage)
        resolve()
      }
      container.addEventListener('message', onMessage)
      controller.postMessage('MOCK_ACTIVATE')
    }
    if (container.controller) activate(container.controller)
    // Not controlled yet (e.g. after a hard reload): wait for the worker to take the page.
    else container.addEventListener('controllerchange', () => activate(container.controller!), { once: true })
  })
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
  // Every API request first makes sure the worker will mock it (see ensureMocking).
  http.interceptors.request.use(async (config) => {
    await ensureMocking()
    return config
  })

  // Loaded only now: engine.io-client keeps the WebSocket constructor it finds
  // when its module is evaluated, and only after start() is it MSW's.
  const { socket } = await import('@/realtime/socket')
  socket.onAny((event: string, payload: unknown) => {
    receivedEvents.push({ event, payload, at: new Date().toISOString() })
  })
}
