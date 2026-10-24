// Order lifecycle of the simulated backend: creation reserves availability,
// settlement (confirmed or declined) happens at `settleAt` and is announced
// with `order.updated`. Settlement is driven by persisted timestamps, not only
// by in-memory timers, so a page reload never loses a pending order.
import type { Order, OrderUpdatedEvent } from '@/api/contracts'
import { findEdition, findNft, getCartRecord, setCartItems } from './commerce'
import { db, nextEventId, saveDb, type OrderRecord } from './db'
import { resolveNftImage } from './images'
import { emitToUser } from './realtime'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function toOrder(record: OrderRecord): Order {
  const {
    userId: _userId,
    idempotencyKey: _key,
    requestHash: _hash,
    settleAt: _settleAt,
    outcome: _outcome,
    ...order
  } = record
  return { ...order, lines: order.lines.map((line) => ({ ...line, image: resolveNftImage(line.image, 'thumb') })) }
}

function settle(orderId: string) {
  timers.delete(orderId)
  const order = db().orders[orderId]
  if (!order || order.status !== 'pending') return // terminal states never change

  const now = new Date().toISOString()
  order.status = order.outcome
  order.version += 1
  order.updatedAt = now

  if (order.outcome === 'confirmed') {
    order.txHash = `0x${randomHex(32)}`
    order.explorerUrl = `https://etherscan.io/tx/${order.txHash}`
    // Remove only the purchased quantities from the cart.
    const ownerKey = `user:${order.userId}`
    const remaining = getCartRecord(ownerKey)
      .items.map((item) => {
        const bought = order.lines.find((line) => line.nftId === item.nftId && line.editionId === item.editionId)
        return bought ? { ...item, quantity: item.quantity - bought.quantity } : item
      })
      .filter((item) => item.quantity > 0)
    setCartItems(ownerKey, remaining)
  } else {
    order.declineReason = 'Pagamento recusado pela carteira'
    // Release the reserved units.
    for (const line of order.lines) {
      const nft = findNft(line.nftId)
      const edition = nft && findEdition(nft, line.editionId)
      if (edition) edition.available += line.quantity
    }
  }

  const event: OrderUpdatedEvent = {
    eventId: nextEventId(),
    type: 'order.updated',
    resourceId: order.id,
    version: order.version,
    occurredAt: now,
    data: {
      status: order.status,
      txHash: order.txHash,
      explorerUrl: order.explorerUrl,
      declineReason: order.declineReason,
    },
  }
  saveDb()
  emitToUser(order.userId, 'order.updated', event)
}

export function scheduleSettlement(order: OrderRecord) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const wait = Math.max(0, new Date(order.settleAt).getTime() - Date.now())
  timers.set(
    order.id,
    setTimeout(() => settle(order.id), wait),
  )
}

/** Called when the mock boots: pending orders resume their settlement. */
export function resumePendingOrders() {
  for (const order of Object.values(db().orders)) scheduleSettlement(order)
}

/** Settles synchronously if the deadline already passed (e.g. timer lost on reload). */
export function settleIfDue(order: OrderRecord) {
  if (order.status === 'pending' && new Date(order.settleAt).getTime() <= Date.now()) settle(order.id)
}
