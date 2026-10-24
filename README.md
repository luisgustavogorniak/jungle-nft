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
| `npm run test:e2e` | Playwright tests (builds and serves the app automatically) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:report` | Open the last HTML report |

## Mock credentials and scenarios

_Coming in the next steps._

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).
