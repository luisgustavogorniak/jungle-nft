# Architecture

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/main.tsx` | Starts MSW (when enabled), then lazy-loads the app |
| `src/App.tsx` | QueryClient + Router providers |
| `src/routes/` | File-based routes (TanStack Router plugin generates `routeTree.gen.ts`) |
| `src/api/` | Axios client, REST contracts and typed endpoint functions |
| `src/features/` | Feature logic: queries, mutations, forms (e.g. `features/auth`) |
| `src/lib/` | Framework-agnostic helpers (ETH math, query client, form errors) |
| `src/realtime/` | Socket.IO client |
| `src/mocks/` | MSW handlers (REST and Socket.IO) |
| `src/components/ui/` | shadcn/ui components |
| `e2e/` | Playwright tests |

## Contracts

`src/api/contracts.ts` holds Zod schemas for every REST resource and realtime event. TS types are inferred from them (`z.infer`), and both the app and the MSW handlers import them, so transport, state and UI share one definition.

- **ETH amounts** are decimal strings (`"1.19"`) and are computed as `bigint` wei in `src/lib/eth.ts`. Floats never touch money. Quantities are integers.
- **Errors** always use the same envelope, `{ error: { code, message, fieldErrors?, details? } }`. The code drives the UI, e.g. `VALIDATION_ERROR` 422, `UNAUTHENTICATED`/`SESSION_EXPIRED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT`/`AVAILABILITY_CONFLICT`/`QUOTE_CHANGED`/`IDEMPOTENCY_CONFLICT` 409, `COUPON_INVALID`/`COUPON_EXPIRED` 422, `SERVICE_UNAVAILABLE` 503.
- **Events** carry `eventId` (dedupe), `resourceId` and a monotonic `version` per resource (stale events are ignored).
- **Orders** are snapshots: lines, prices and totals are copied at creation.

## HTTP client

`src/api/http.ts` (Axios):

- The request interceptor adds `Authorization: Bearer <token>` and `X-Guest-Id`. The guest id owns the visitor cart until it is merged on login.
- The response interceptor turns every failure into an `ApiError`: API errors, `NETWORK_ERROR`, `TIMEOUT` and `CANCELED`. `isTransient` marks failures worth retrying.
- When an authenticated request to a private resource gets a 401, `onSessionExpired` listeners are notified. `/auth/*` endpoints are excluded: a wrong password and the boot-time session check handle 401 themselves.

## Session policy

- **Storage.** The token lives in `localStorage` (`kurio.token`), so the session survives refresh. Passwords exist only in the login/register request body, and the mock stores salted SHA-256 hashes. In a real backend, an `HttpOnly` cookie would be preferable. With MSW there is no server to set one.
- **Boot.** The `['session']` query calls `GET /auth/session` when a token exists. A 401 discards the token and the user continues as a visitor (`null`), not as an error.
- **Lifetime.** 30 minutes (`SESSION_TTL_MS` in the mock).
- **Route guard.** `src/routes/_authenticated.tsx` is a pathless layout. Its `beforeLoad` uses `ensureQueryData(sessionQueryOptions)` and redirects to `/login?redirect=<current url>`. Login and register only accept same-origin paths as `redirect` (`safeRedirect`), which prevents open redirects.
- **Expiration while navigating.** A private request answered with 401 triggers `onSessionExpired`. `App.tsx` ends the local session, shows a toast and navigates to `/login?redirect=<current url>&reason=expired`. After logging in again, the user returns to the same URL. Server-side state (cart, pending order) is untouched, so the checkout can resume.
- **Logout and user switch.** `endSession` drops the token, disconnects the socket and removes every cached query except the session one. It does not call `queryClient.clear()`, which would also delete the session query object and leave mounted observers (the header) subscribed to a dead query. Login runs the same cleanup before storing the new session, so data cached for a previous user or visitor is never shown. The local logout is immediate, and revoking the token on the server is best effort. Closing the tab right after "Sair" therefore never keeps the user logged in.

## Query defaults

`src/lib/query-client.ts`: `staleTime` 30 s. Queries retry at most twice and only on transient failures (connection, timeout, 5xx), since retrying a 4xx would fail the same way. Mutations are never retried automatically, so side effects are not duplicated. Per-feature policies are documented with each feature.

## Mock backend

| File | Role |
| --- | --- |
| `src/mocks/db.ts` | Backend state (catalog, users, sessions, carts, favorites, wallets, quotes, orders), persisted in `localStorage` (`kurio.mock.db`). `resetDb()` restores the seed. `SCHEMA_VERSION` discards stale persisted state. |
| `src/mocks/fixtures/` | Deterministic seed: 36 NFTs (the first 9 reproduce the home grid of the layout), 2 users, wallets, favorites, coupons. |
| `src/mocks/scenarios.ts` | Network scenarios: latency (seeded PRNG), out-of-order responses and failure injection per route. |
| `src/mocks/utils.ts` | `withScenario` (latency + failures around a resolver), error envelope, auth helpers, serializers. |
| `src/mocks/images.ts` | Maps an image file name to the bundled asset URL, with a placeholder fallback. |
| `src/mocks/browser.ts` | Applies `?scenario` / `?mock-reset`, loads the DB and starts the worker. |

The app never imports from `src/mocks/` besides the `startMocking()` call in `main.tsx`.

### Fixture data consistency

The layout uses different token IDs for the same NFT on different screens (Violet Nomad `#0009` vs `#0314`). In the mock, the token ID always comes from the number in the name (`Violet Nomad #314` → `#0314`), and every screen reads it from the same source.

### Images

The layout has four artworks shared by several NFTs. The mock stores only the image file name (`ape-green.png`), never a URL. URLs are resolved per response through `import.meta.glob('/src/assets/nfts/*')`. Vite fingerprints asset URLs per build, so a persisted URL would go stale, and a persisted placeholder would hide images added later.

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
