import { setupWorker } from 'msw/browser'
import { initDb, resetDb } from './db'
import { handlers } from './handlers'
import { getScenarioName, setScenarioName } from './scenarios'

export const worker = setupWorker(...handlers)

declare global {
  interface Window {
    /** Mock controls for manual testing and Playwright. */
    __kurioMock?: {
      reset: () => Promise<void>
      setScenario: (name: string) => void
      getScenario: () => string
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

  if (scenario || shouldReset) {
    url.searchParams.delete('scenario')
    url.searchParams.delete('mock-reset')
    window.history.replaceState(window.history.state, '', url)
  }

  window.__kurioMock = {
    reset: resetDb,
    setScenario: setScenarioName,
    getScenario: getScenarioName,
  }

  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })
}
