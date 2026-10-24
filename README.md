# Jungle NFT Marketplace

NFT marketplace built for the Jungle Gaming frontend challenge. All APIs, auth, wallets and payments are simulated with MSW (REST + Socket.IO).

## Stack

React 19, TypeScript, Vite, TanStack Router, TanStack Query, Axios, Socket.IO client, Tailwind CSS 4, shadcn/ui, MSW 2, Playwright, Lighthouse.

## Setup

Requirements: Node 24+, npm 11+.

```sh
npm install
npx playwright install chromium
npm run dev
```

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Starts MSW (REST + Socket.IO) before the app. Enabled in the demo build. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with mocks |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript project check |
| `npm run lint` | ESLint |
| `npm run assets:optimize` | Regenerates the WebP artwork variants from `design-assets/nfts/` |
| `npm run test:unit` | Unit tests (Node test runner, no extra dependency) |
| `npm run test:e2e` | All Playwright tests, functional and visual (builds and serves the app automatically) |
| `npm run test:e2e:functional` | Everything except the visual regression |
| `npm run test:e2e:visual` | Only the visual regression (`@visual`) |
| `npm run test:e2e:visual:update` | Regenerates the visual baselines |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:report` | Open the last HTML report |

## Mock credentials

| User | E-mail | Password |
| --- | --- | --- |
| Nova Sato (two wallets) | `nova@kurio.test` | `Kurio@2026` |
| Leo Arcos (no secondary wallet) | `leo@kurio.test` | `Kurio@2026` |

Coupons: `KURIO10` (10%), `GENESIS25` (25%), `MINT2025` (expired). Any other code is invalid.

## Scenarios and reset

Add query params to any URL. They are applied before the app starts and removed from the address bar.

| Param | Effect |
| --- | --- |
| `?scenario=<name>` | Selects a network scenario. It persists across reloads until another one is chosen. |
| `?mock-reset` | Restores the seed data (catalog, users, carts, favorites, wallets, orders). |

The mock backend keeps its whole state (users, sessions, carts, favorites, wallets, orders) in the browser's `localStorage` under `kurio.mock.db`, so everything you change survives a refresh. It is per browser and per origin. `?mock-reset` discards that state and restores the initial data; it is also what to use after the seed changes (a schema version mismatch triggers the same reset).

Example: `http://localhost:5173/?scenario=slow&mock-reset`. In the browser console, `window.__kurioMock` exposes `reset()`, `setScenario(name)`, `getScenario()`, `expireSessions()`, `updateNft(nftId, { price?, editions? })` (changes the NFT and broadcasts `nft.updated` through Socket.IO) `dropConnections()` (the mock server closes every socket; the client reconnects and reconciles with REST), `replayLastEvent()` (delivers the last event again, same `eventId`), `emitStaleNftUpdate(nftId, price)` (delivers an older state late: lower version, new `eventId`; the record is untouched), `settlePendingOrders()` (settles every pending order now and emits `order.updated` to its owner) and `receivedEvents()` (every event the app's `socket.io-client` received since the page loaded; a mock-only probe used by the E2E tests).

### Reproducing failure flows

| Flow | How |
| --- | --- |
| Wrong credentials | Log in with any wrong password |
| Register conflict | Register with `nova@kurio.test` or username `novasato` |
| Session expired while navigating | Log in, run `__kurioMock.expireSessions()` in the console, then open "Meu perfil" |
| Private route as visitor | Open `/profile` logged out: you are sent to login and back after authenticating |
| Pending order recovered after reload | Open `/?scenario=slow-payment`, buy something and reload the order page while it is pending: the state comes back from the API and the confirmation arrives via Socket.IO |
| Wallet connection refused | Open `/checkout?scenario=wallet-rejected` logged in with items in the cart and click "Conectar carteira". Switch back with `__kurioMock.setScenario('default')` to connect |
| Timeout after the order was created | Open `/checkout?scenario=order-timeout`, connect, review and confirm. After 10 s the error offers "Tentar novamente", which reuses the idempotency key and opens the same order (no duplicate) |
| Pending order notice | With `slow-payment`, buy something and open the cart within 8 s: a notice links to the pending order |
| Declined payment | Open `/?scenario=payment-declined` and buy something: the order is declined and the items stay in the cart |
| Price change with the item in the cart | Add an NFT to the cart, then open `/cart?scenario=price-change` (or `/checkout?scenario=price-change` logged in). About 4 s later the first cart item gets 10% more expensive via `nft.updated`: a notice is announced (`aria-live`), the summary is recalculated and, on the checkout, "Confirmar compra" stays disabled until "Aceitar novo valor". It fires once per page load; reload to repeat. For an exact value: `__kurioMock.updateNft('emerald-ape-042', { price: '1.50' })` |
| Sold out while in the cart | `__kurioMock.updateNft('emerald-ape-042', { editions: [{ id: '1-50', available: 0 }] })` with that edition in the cart |
| Missed events after a reconnection | On the cart, run `__kurioMock.dropConnections(); __kurioMock.updateNft('emerald-ape-042', { price: '1.50' })`: no event is delivered, and the new price arrives from REST once the socket reconnects |

| Scenario | Behavior |
| --- | --- |
| `default` | Everything works, 150–450 ms latency. Payments confirm after 2 s |
| `slow-payment` | Payments stay pending for 8 s before confirming, long enough to see the pending state and reload the order page |
| `wallet-rejected` | The wallet refuses every connection request on the checkout |
| `order-timeout` | The order is created but its response never arrives; the client times out after 10 s and "Tentar novamente" recovers the same order |
| `payment-declined` | Payments are declined after 2 s |
| `price-change` | 4 s after the first quote of the page load, the first cart item gets 10% more expensive (`nft.updated`) |
| `slow` | 2.5–3.5 s latency on every request |
| `empty-catalog` | Catalog returns no results |
| `out-of-order` | Catalog responses alternate 1.5 s / 0.1 s, so older requests resolve last |
| `offline` | Catalog requests fail with a connection error |
| `server-error` | Catalog requests fail with HTTP 500 |

Latency is generated by a seeded PRNG, so the same sequence of requests always gets the same delays.

## Tests

```sh
npm run test:unit   # Node test runner
npm run test:e2e    # Playwright, desktop (1440×900) and mobile (Pixel 7), Chromium
```

Playwright builds the app and serves it with `vite preview` on port 4173, the same artifact that is deployed. If something is already listening on 4173 it is reused, so stop any old `npm run preview` first, or the tests run against a stale build.

Every test starts from a known state: it opens its first page with `openFresh` (`?mock-reset&scenario=…`), which restores the seed data and picks the scenario, and each test gets a new browser context (empty `localStorage`). Time-sensitive tests use `page.clock`; the Socket.IO ones go through the real `socket.io-client`, driven by the `window.__kurioMock` controls above.

A run has **0 skipped tests**. The confirmation of an order is a modal on desktop and a page on mobile, so that test checks the format of each project instead of skipping one of them.

**Report and traces.** Every run writes an HTML report to `playwright-report/` (`npm run test:e2e:report` opens it). A failing test keeps its trace, a screenshot and an error context in `test-results/<test>/`; open a trace with `npx playwright show-trace test-results/<test>/trace.zip`, or from the report.

### Visual regression

`e2e/visual.spec.ts` captures the home, the NFT detail, the cart and the payment page, full page, on desktop and mobile. The data is stable: seed reset, `default` scenario, fixed `page.clock`, animations disabled, fonts and images loaded before the capture.

Baselines are committed in `e2e/__screenshots__/visual.spec.ts/<project>/`. They are **not** suffixed per OS (see `snapshotPathTemplate` in `playwright.config.ts`), so a checkout on macOS or Linux compares against the same images instead of failing for lack of a baseline. Font rasterization still differs between systems, so the comparison tolerates 2% of different pixels (`maxDiffPixelRatio`, `threshold: 0.2`). That absorbs antialiasing and hinting but still catches a missing section, a wrong color or a broken layout.

The baselines were generated on Windows 11 with the Chromium that ships with Playwright 1.64. The tolerance was only exercised on that machine, so portability to macOS/Linux is expected, not verified. If a visual test fails on another system with no change to the UI, generate a local baseline and run again:

```sh
npm run test:e2e:visual:update   # rewrites the baselines for this machine
npm run test:e2e
```

To skip the visual tests entirely, run `npm run test:e2e:functional`. Do not commit baselines regenerated on a different machine without reviewing the diff.

## NFT images

Originals live in `design-assets/nfts/` (4 PNG artworks shared by several NFTs, as in the layout). `npm run assets:optimize` generates `src/assets/nfts/<name>-480.webp` (cards) and `-960.webp` (hero, detail), which are what the app serves (16–69 KB instead of ~2 MB). The first nine NFTs follow the mapping of the layout and the others rotate through the four (`src/mocks/fixtures/nfts.ts`).

## Catalog URL

Search, filters, tab, sort and page live in the URL, e.g. `/?q=ape&categories=music&categories=3d-art&networks=ethereum&minPrice=0.5&sort=price-asc&page=2`. Invalid values are ignored. Changing any filter returns to page 1.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).
