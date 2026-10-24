import { queryOptions, useMutation } from '@tanstack/react-query'
import { ordersApi } from '@/api/commerce'
import type { CreateOrderRequest } from '@/api/contracts'

export const orderKeys = {
  all: ['orders'] as const,
  detail: (orderId: string) => ['orders', orderId] as const,
}

/** Always read from the API on mount: after a reload the REST state is the source of truth. */
export const orderQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    staleTime: 0,
  })

const ATTEMPT_KEY = 'kurio.checkout.attempt'

/**
 * One idempotency key per purchase attempt (per quote). Kept in sessionStorage,
 * so a retry after a timeout or a reload reuses it and recovers the same order.
 */
export function idempotencyKeyFor(quoteId: string): string {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? 'null') as { quoteId: string; key: string } | null
    if (stored?.quoteId === quoteId) return stored.key
  } catch {
    // Unreadable storage: fall through to a new key.
  }
  const key = crypto.randomUUID()
  try {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({ quoteId, key }))
  } catch {
    // Storage unavailable: the key still protects in-flight retries.
  }
  return key
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateOrderRequest; idempotencyKey: string }) =>
      ordersApi.create(body, idempotencyKey),
  })
}
