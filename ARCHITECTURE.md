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
- **Default namespace only, no rooms or broadcast helpers.** Per-user isolation is implemented in the handler (see below).
- **Link by origin.** MSW strips the `/socket.io/` path before matching, so the link targets `window.location.origin` (with `ws`/`wss`).
- **The mock lives in the page.** A reload restarts the simulated server. Anything time-based (payment settlement) is therefore driven by persisted timestamps, not only by in-memory timers.

### Authentication and scoping

The client passes `auth: (cb) => cb({ token: getToken() })`, so every (re)connection sends the current token in the Socket.IO CONNECT packet (`40{"token":"..."}`). The mock reads that packet, resolves the session and stores the `userId` on the connection. `emitToUser(userId, …)` delivers private events (`order.updated`) only to that user's connections, while `broadcast` sends public ones (`nft.updated`). Visitors connect too (without a token), because they also have a cart and see the catalog. When the user changes (login, logout, expiration), `useRealtime` removes its listeners, disconnects and opens a new connection with the new token, so a previous session's private events can never reach the next user. The listeners are also released when the root unmounts.

### Client handling

`src/realtime/events.ts` validates every event against the contract, ignores already seen `eventId`s and ignores events whose `version` is not newer than the cached resource. A confirmed `order.updated` also invalidates cart and quote, because the server removed the purchased items.

`nft.updated` carries `{ price, oldPrice, editions: [{ id, available }] }` and the NFT `version`. Every REST representation of an NFT carries the same version: `Nft.version` in list and detail, and `CartItem.nftVersion` in the cart. The client compares the event with the highest version found in any of those caches, so after a REST reconciliation a late event that is older than the fetched state is still discarded. A newer event patches detail and list caches in place (`setQueriesData`). If the NFT is in the cart, the cart line is patched, a notice is announced and cart and quote are re-read: totals keep coming only from the API.

The mock bumps the version and broadcasts `nft.updated` on every catalog change: the `updateNft` control, the `price-change` scenario, units reserved by an order and units released by a declined payment. REST and events therefore always describe the same state.

**Notice.** `LiveAnnouncer` (root layout) is a `role="status"` / `aria-live="polite"` region that is always mounted, so screen readers announce text inserted later. It is also the visible notice (with a close button). Toasts are not used for this because sonner has its own live region and the message would be read twice.

**Stale quote on checkout.** The checkout keeps the quote the user reviewed. A new quote with different content (lines, unit prices, quantities, totals) shows the previous and the new total in an alert and disables "Confirmar compra" until "Aceitar novo valor". Quotes are compared by content, not by id, because every quote request returns a new id. The purchase is also blocked while the quote is being re-requested and while it has availability issues. The server still answers `409 QUOTE_CHANGED` as the last barrier.

### Reconciliation with REST

On every `connect`, active `['orders', …]` queries are invalidated and refetched from REST. On a reconnection (any `connect` after the first one of that socket session), catalog, cart and quote are invalidated as well, so changes missed while disconnected are recovered. On the first connection the pages have just fetched their data, so only orders are re-read (a payment can settle between the fetch and the connection). Re-reading everything there would cancel and repeat the requests in flight on every page load. Known gap: a catalog event sent in the few milliseconds between the first fetch and the first connection is lost until the next fetch. The order page always reads `GET /api/orders/:id` on mount (`staleTime: 0`), and the events then keep the same cache entry up to date. There is no polling.

## Orders

| Rule | Where |
| --- | --- |
| Creation needs `Idempotency-Key`. The same key with the same body returns the original order, and the same key with a different body returns `409 IDEMPOTENCY_CONFLICT`. | `src/mocks/handlers/orders.ts` |
| The quote must belong to the user and still match the current cart pricing, otherwise `409 QUOTE_CHANGED`. | `quoteStillValid` in `src/mocks/commerce.ts` |
| Units are reserved at creation and released if the payment is declined. | `src/mocks/orders.ts` |
| Settlement happens at the persisted `settleAt`. On boot the mock reschedules pending orders, and `GET /api/orders/:id` settles an order whose deadline has passed. | `resumePendingOrders`, `settleIfDue` |
| Confirmed and declined are terminal. A confirmation removes only the purchased quantities from the cart. | `settle` |
| The receipt is a snapshot (lines, prices, totals copied at creation), so later catalog changes never alter it. | `OrderRecord` |
| Another user's order answers 404, so ids cannot be probed. | `GET /api/orders/:id` |

The client keeps one idempotency key per quote in `sessionStorage` (`idempotencyKeyFor`). Retrying the same attempt therefore reuses it.

## Cart

The cart lives on the (mock) server, keyed by owner: `user:<id>` when authenticated, `guest:<X-Guest-Id>` otherwise. On login or register, the visitor cart is merged into the user cart, capped by availability. Prices and availability are joined from the live catalog on every read. Totals always come from `POST /api/quote`, never from client-side math.

## Catalog and layout (E4a)

- **URL state.** `src/lib/search-params.ts` encodes search params as plain query strings (repeated keys for arrays) instead of TanStack's JSON encoding. `parseCatalogSearch` validates field by field with zod, so one bad value does not discard the rest. The router keeps unknown params next to validated ones, so `useCatalogSearch` sanitizes again.
- **Query keys follow the filters** (`['nfts', 'list', query]`). The query `signal` aborts superseded requests, and `keepPreviousData` keeps the old results on screen (dimmed, `aria-busy`) while the next load. Out-of-order responses cannot overwrite a newer choice because the observer only follows the current key (covered by the `out-of-order` scenario test).
- **Retries.** Catalog failures are transient (connection, timeout, 5xx), so they retry twice with backoff before showing the error panel (about 3 s of skeletons), then "Tentar novamente" refetches.
- **Facets** count the NFTs matching every filter except their own group.
- **Skeletons** reuse the card box model (aspect ratios), so loading does not shift the layout. Shimmer is disabled under `prefers-reduced-motion`.

### Deviations from the Figma (E4a)

| Figma | Implementation | Why |
| --- | --- | --- |
| Collections out of alphabetical order | Sorted A–Z (pt-BR) | Comment in the file asks for it |
| Filters as a plain list | Checkboxes, combinable | Challenge requires combinable filters |
| Price slider only | Slider + min/max inputs + Apply | Slider is imprecise on mobile (comment) |
| Mobile infinite scroll | Numbered pagination | Page must live in the URL and survive refresh/history |
| Central scan FAB in the tab bar | Omitted | No defined action (comment) |
| Mobile filter drawer not drawn | Sheet with the same panel | Required for mobile |
| Medallions W/C/D | Icons | Letters have no meaning (comment) |
| Social brand icons | Text chips (FB, IG…) | lucide v1 dropped brand icons |
| Prices with comma in the range label | Dot everywhere | Consistent with all other ETH values |
| Tablet not drawn | Header fits at 768; filters become a drawer below 1280; 3 columns | Breakpoints suggested in the spec |
| Editorial pages, newsletter, footer help links | Honest "not part of the demo" toast | Out-of-scope actions must not look successful |

## E4b: detalhe e favoritos
- **Favoritos otimistas:** `useToggleFavorite` atualiza o cache em `onMutate`, restaura o snapshot em `onError` (com toast) e só o último toggle em voo reconcilia com o servidor (`onSettled` + `isMutating`). PUT/DELETE idempotentes no mock; visitante é enviado ao login e volta ao NFT.
- **Edição pré-selecionada:** derivada (primeira com estoque, ou a escolha do usuário enquanto tiver estoque), não guardada em estado. Sem estoque: botões desabilitados com texto associado por `aria-describedby`.
- **Detalhe mobile sem tab bar** (como no Figma): a barra de compra fixa a substitui, e o toast "adicionado" traz a ação "Ver carrinho".
- **Desvios do Figma:** galeria repete a única arte da API; sem zoom nem "Compartilhar"; aba Avaliações com aviso (não desenhada); botão de carrinho também no desktop (o frame só tem COMPRAR).

## E5: carrinho completo
- **Contratos:** `PATCH /cart/items/:nftId/:editionId` (quantidade absoluta, 409 se acima do estoque) e `DELETE` idempotente. Cupom segue na cotação (`POST /quote`).
- **Edição otimista com rollback** (`useCartEdit`): a linha muda na hora; em erro volta o snapshot e um toast explica; só a última edição em voo recarrega carrinho e cotação.
- **Cupom:** só é guardado depois que a API o aceita (sessionStorage, compartilhado entre carrinho e checkout). Inválido/expirado mostra o motivo no campo; um cupom que expirar depois é removido com aviso (`useCartQuote`). Logout limpa.
- **Totais** continuam vindo só da cotação; enquanto uma nova carrega, os valores anteriores ficam esmaecidos (`aria-busy`) e "Conectar e finalizar" fica desabilitado. Itens com problema de estoque aparecem na linha e bloqueiam a finalização.
- **Visitante:** `guestId` já identificava o carrinho; o merge no login e a persistência no refresh têm teste E2E.
- **Desvios do Figma:** lixeira na linha do nome no mobile (no frame ela sobrepõe o "+", como apontado nos comentários); tab bar escondida em carrinho/detalhe (o frame não a desenha); coluna "Edições" mostra o stepper e a edição vai sob o nome; steppers iguais nas duas larguras exceto o tamanho.

## E6: tempo real completo
- **Socket para visitante também:** `nft.updated` é público e o visitante tem carrinho. A troca de usuário abre uma conexão nova com o token novo, o que mantém o escopo dos eventos privados.
- **Versão em todo REST de NFT** (`Nft.version`, `CartItem.nftVersion`): o descarte de evento antigo funciona mesmo depois de uma reconciliação.
- **Reconciliação** em toda reconexão (catálogo, carrinho, cotação, pedidos). Na primeira conexão, só pedidos.
- **Aviso** em uma região `aria-live` sempre montada, que também é o aviso visível. Sem toast, para não ser lido duas vezes.
- **Checkout** compara a cotação por conteúdo e exige "Aceitar novo valor". O servidor mantém o `QUOTE_CHANGED`.
- **Mock:** `updateNft`, `dropConnections` e o cenário `price-change`. Reserva e liberação de unidades por pedido também emitem `nft.updated`.
