// In-memory state of the simulated backend, persisted to localStorage so it
// survives refresh. `resetDb()` restores the known seed state.
import type { CartItemInput, Order, Quote, Wallet } from '@/api/contracts'
import { buildNftFixtures, type NftRecord } from './fixtures/nfts'
import { demoFavorites, demoPassword, demoUsers, demoWallets, type UserRecord } from './fixtures/users'

const STORAGE_KEY = 'kurio.mock.db'
// Bump when the shape or the fixtures change: stale persisted state is discarded.
const SCHEMA_VERSION = 4

export type SessionRecord = { token: string; userId: string; expiresAt: string }
export type CartRecord = { items: CartItemInput[]; updatedAt: string }
export type QuoteRecord = Quote & { ownerKey: string }
/** Line images hold the file name; they are resolved to URLs when serialized. */
export type OrderRecord = Order & {
  userId: string
  idempotencyKey: string
  requestHash: string
  /** When the simulated payment settles, and how. Persisted so a reload can resume it. */
  settleAt: string
  outcome: 'confirmed' | 'declined'
}

export type DbState = {
  schemaVersion: number
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  favorites: Record<string, string[]> // by userId
  carts: Record<string, CartRecord> // by owner key: "user:<id>" or "guest:<id>"
  wallets: Record<string, Wallet[]> // by userId
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  eventSeq: number
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function seed(): Promise<DbState> {
  const users = await Promise.all(
    demoUsers.map(async (user) => ({ ...user, passwordHash: await hashPassword(demoPassword, user.salt) })),
  )
  return {
    schemaVersion: SCHEMA_VERSION,
    nfts: buildNftFixtures(),
    users,
    sessions: [],
    favorites: structuredClone(demoFavorites),
    carts: {},
    wallets: structuredClone(demoWallets),
    quotes: {},
    orders: {},
    eventSeq: 0,
  }
}

let state: DbState | null = null
/** Last JSON written to localStorage: what a failed save rolls back to. */
let persisted: string | null = null
let storageFull = false

export function db(): DbState {
  if (!state) throw new Error('Mock database not initialized: call initDb() first')
  return state
}

/** Persists the current state. Call after every mutation. */
export function saveDb() {
  try {
    const json = JSON.stringify(db())
    localStorage.setItem(STORAGE_KEY, json)
    persisted = json
    storageFull = false
  } catch (error) {
    // Other failures (storage unavailable): state stays in memory for this tab.
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
      storageFull = true
    }
  }
}

/**
 * Called after each request: when its save hit the storage quota, the change is
 * undone (back to the last persisted state) so memory and storage never diverge.
 */
export function rollbackIfStorageFull(): boolean {
  if (!storageFull) return false
  storageFull = false
  if (persisted) state = JSON.parse(persisted) as DbState
  return true
}

export async function initDb(): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? (JSON.parse(raw) as DbState) : null
    if (stored?.schemaVersion === SCHEMA_VERSION) {
      state = stored
      persisted = raw
      return
    }
  } catch {
    // Corrupted payload: fall through to a fresh seed.
  }
  await resetDb()
}

export async function resetDb(): Promise<void> {
  state = await seed()
  saveDb()
}

export function nextEventId(): string {
  const current = db()
  current.eventSeq += 1
  return `evt-${current.eventSeq}`
}
