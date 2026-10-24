// Network scenarios: latency and failure injection per route, selected with
// `?scenario=<name>` and kept in localStorage. Deterministic: latency comes from
// a seeded PRNG, so the same sequence of requests always gets the same delays.

export type FailureMode = 'network' | 'timeout' | 500 | 503

/** Route keys used by handlers to look up scenario behavior. */
export type RouteKey =
  | 'catalog.list'
  | 'catalog.detail'
  | 'auth'
  | 'favorites.read'
  | 'favorites.write'
  | 'cart.read'
  | 'cart.write'
  | 'quote'
  | 'orders.create'
  | 'orders.read'
  | 'profile'
  | 'wallets'

export type Scenario = {
  description: string
  latency: { min: number; max: number }
  /** Per-route latency override, e.g. a slow catalog only. */
  routeLatency?: Partial<Record<RouteKey, { min: number; max: number }>>
  /** Alternating slow/fast responses on these routes, so responses arrive out of order. */
  outOfOrder?: RouteKey[]
  failures?: Partial<Record<RouteKey, FailureMode>>
  emptyCatalog?: boolean
  /** How long a payment stays pending and how it ends. Default: confirmed after 2s. */
  settlement?: { delayMs: number; outcome: 'confirmed' | 'declined' }
  /** After the first quote of the page load, the first cart item gets `percent` more expensive. */
  priceChange?: { delayMs: number; percent: number }
}

export const DEFAULT_SETTLEMENT = { delayMs: 2000, outcome: 'confirmed' } as const

export const scenarios = {
  default: {
    description: 'Everything works, with a small variable latency.',
    latency: { min: 150, max: 450 },
  },
  'slow-payment': {
    description: 'Payments stay pending for 6 seconds before confirming (refresh/reconnect recovery).',
    latency: { min: 150, max: 450 },
    settlement: { delayMs: 6000, outcome: 'confirmed' },
  },
  'payment-declined': {
    description: 'Payments are declined by the simulated network after 2 seconds.',
    latency: { min: 150, max: 450 },
    settlement: { delayMs: 2000, outcome: 'declined' },
  },
  'price-change': {
    description: 'Four seconds after the cart or checkout loads, the first cart item gets 10% more expensive (nft.updated).',
    latency: { min: 150, max: 450 },
    priceChange: { delayMs: 4000, percent: 10 },
  },
  slow: {
    description: 'Every response takes 2.5 to 3.5 seconds (skeletons and loading states).',
    latency: { min: 2500, max: 3500 },
  },
  'empty-catalog': {
    description: 'The catalog has no results for any query.',
    latency: { min: 150, max: 450 },
    emptyCatalog: true,
  },
  'out-of-order': {
    description: 'Catalog responses alternate between 1.5s and 0.1s, so older requests resolve last.',
    latency: { min: 100, max: 200 },
    outOfOrder: ['catalog.list'],
  },
  offline: {
    description: 'Catalog requests fail with a connection error.',
    latency: { min: 100, max: 200 },
    failures: { 'catalog.list': 'network', 'catalog.detail': 'network' },
  },
  'favorites-error': {
    description: 'Adding or removing favorites fails with HTTP 500 (optimistic update and rollback).',
    latency: { min: 150, max: 450 },
    failures: { 'favorites.write': 500 },
  },
  'cart-error': {
    description: 'Changing or removing cart items fails with HTTP 500 (optimistic update and rollback).',
    latency: { min: 150, max: 450 },
    failures: { 'cart.write': 500 },
  },
  'server-error': {
    description: 'Catalog requests fail with HTTP 500.',
    latency: { min: 100, max: 200 },
    failures: { 'catalog.list': 500, 'catalog.detail': 500 },
  },
} satisfies Record<string, Scenario>

export type ScenarioName = keyof typeof scenarios

const STORAGE_KEY = 'kurio.mock.scenario'

function isScenarioName(value: string | null): value is ScenarioName {
  return value !== null && value in scenarios
}

export function getScenarioName(): ScenarioName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isScenarioName(stored) ? stored : 'default'
  } catch {
    return 'default'
  }
}

export function setScenarioName(name: string) {
  if (!isScenarioName(name)) throw new Error(`Unknown scenario "${name}"`)
  localStorage.setItem(STORAGE_KEY, name)
  resetLatencySequence()
}

export function getScenario(): Scenario {
  return scenarios[getScenarioName()]
}

// ---------- Deterministic latency ----------

let seed = 0
const routeCounters = new Map<RouteKey, number>()

function resetLatencySequence() {
  seed = 0
  routeCounters.clear()
}

// mulberry32: tiny seeded PRNG.
function random(): number {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function latencyFor(route: RouteKey): number {
  const scenario = getScenario()
  if (scenario.outOfOrder?.includes(route)) {
    const count = (routeCounters.get(route) ?? 0) + 1
    routeCounters.set(route, count)
    return count % 2 === 1 ? 1500 : 100
  }
  const { min, max } = scenario.routeLatency?.[route] ?? scenario.latency
  return Math.round(min + random() * (max - min))
}
