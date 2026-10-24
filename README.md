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
| `npm run test:e2e` | Playwright tests (builds and serves the app automatically) |
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

Example: `http://localhost:5173/?scenario=slow&mock-reset`. In the browser console, `window.__kurioMock` exposes `reset()`, `setScenario(name)`, `getScenario()`, `expireSessions()`, `updateNft(nftId, { price?, editions? })` (changes the NFT and broadcasts `nft.updated` through Socket.IO) `dropConnections()` (the mock server closes every socket; the client reconnects and reconciles with REST), `settlePendingOrders()` (settles every pending order now and emits `order.updated` to its owner) and `receivedEvents()` (every event the app's `socket.io-client` received since the page loaded; a mock-only probe used by the E2E tests).

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

## NFT images

Originals live in `design-assets/nfts/` (4 PNG artworks shared by several NFTs, as in the layout). `npm run assets:optimize` generates `src/assets/nfts/<name>-480.webp` (cards) and `-960.webp` (hero, detail), which are what the app serves (16–69 KB instead of ~2 MB). The first nine NFTs follow the mapping of the layout and the others rotate through the four (`src/mocks/fixtures/nfts.ts`).

## Catalog URL

Search, filters, tab, sort and page live in the URL, e.g. `/?q=ape&categories=music&categories=3d-art&networks=ethereum&minPrice=0.5&sort=price-asc&page=2`. Invalid values are ignored. Changing any filter returns to page 1.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).
