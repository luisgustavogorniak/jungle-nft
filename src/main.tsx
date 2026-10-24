import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  // Dynamic import keeps MSW out of the bundle when mocks are disabled.
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

// The app is imported only after MSW starts: engine.io-client captures
// globalThis.WebSocket at module evaluation, so a static import would grab
// the native WebSocket before MSW patches it and bypass the mocks.
enableMocking()
  .then(() => import('./App'))
  .then(({ App }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
