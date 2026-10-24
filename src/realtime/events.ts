// Applies realtime events to the query cache. Events are validated against the
// contract, deduplicated by eventId and ignored when older than the cached version.
import type { QueryClient } from '@tanstack/react-query'
import { orderUpdatedEventSchema, type Order } from '@/api/contracts'
import { cartKeys } from '@/features/cart/queries'
import { orderKeys } from '@/features/orders/queries'

const MAX_SEEN = 500
const seenEventIds = new Set<string>()

/** True the first time an event id is seen. Bounded so memory does not grow forever. */
function firstTimeSeen(eventId: string): boolean {
  if (seenEventIds.has(eventId)) return false
  seenEventIds.add(eventId)
  if (seenEventIds.size > MAX_SEEN) seenEventIds.delete(seenEventIds.values().next().value!)
  return true
}

export function applyOrderUpdated(queryClient: QueryClient, payload: unknown) {
  const parsed = orderUpdatedEventSchema.safeParse(payload)
  if (!parsed.success || !firstTimeSeen(parsed.data.eventId)) return
  const event = parsed.data
  const key = orderKeys.detail(event.resourceId)
  const cached = queryClient.getQueryData<Order>(key)

  if (cached && event.version <= cached.version) return // stale or already applied
  if (cached) {
    queryClient.setQueryData<Order>(key, {
      ...cached,
      ...event.data,
      version: event.version,
      updatedAt: event.occurredAt,
    })
  } else {
    void queryClient.invalidateQueries({ queryKey: key })
  }

  // A confirmed order removed the purchased items from the server cart.
  if (event.data.status === 'confirmed') {
    void queryClient.invalidateQueries({ queryKey: cartKeys.cart })
    void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
  }
}
