# Architecture

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/main.tsx` | Starts MSW (when enabled), then lazy-loads the app |
| `src/App.tsx` | QueryClient + Router providers |
| `src/routes/` | File-based routes (TanStack Router plugin generates `routeTree.gen.ts`) |
| `src/api/` | Axios client and REST contracts |
| `src/realtime/` | Socket.IO client |
| `src/mocks/` | MSW handlers (REST and Socket.IO) |
| `src/components/ui/` | shadcn/ui components |
| `e2e/` | Playwright tests |

## Decisions

### MSW 2 instead of MSW 3

The challenge recommends `@mswjs/socket.io-binding` for Socket.IO mocking. Its latest release (0.2.0) declares `msw@^2.10.2` as peer dependency, so the project uses MSW 2.15. Forcing it on MSW 3 (`--legacy-peer-deps`) would be an unsupported combination.

### App loaded after MSW starts

`engine.io-client` captures `globalThis.WebSocket` when its module is evaluated. If the app (and therefore `socket.io-client`) were imported statically in `main.tsx`, it would keep the native WebSocket and bypass MSW. `main.tsx` awaits `worker.start()` and only then does `import('./App')`.

### Tests run against the production build

Playwright's `webServer` runs `build` + `preview`, so E2E tests exercise the same artifact that is deployed (mocks included).

## Real-time transport in the mock environment

Socket.IO events are produced by MSW handlers (`src/mocks/realtime.ts`) through `ws.link` + `@mswjs/socket.io-binding`; the app uses the real `socket.io-client`.

Limitations:

- **WebSocket transport only.** The binding intercepts WebSocket, not HTTP long-polling, so the client uses `transports: ['websocket']`.
- **Fake handshake without heartbeat.** The binding sends the Engine.IO open packet (`pingInterval` 25s, `pingTimeout` 5s) but never pings. The handler sends a raw ping (`"2"`) every 20s, otherwise the client would drop and reconnect every ~30s.
- **Default namespace only, no rooms or broadcast helpers.** Per-user isolation must be implemented in the handler.
- **Link by origin.** MSW strips the `/socket.io/` path before matching, so the link targets `window.location.origin` (with `ws`/`wss`).
