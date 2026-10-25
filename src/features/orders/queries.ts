import { useSyncExternalStore } from 'react'
import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/api/commerce'
import type { CreateOrderRequest, Order } from '@/api/contracts'
import { isApiError } from '@/api/http'
import { useSession } from '@/features/auth/session'

export const orderKeys = {
  all: ['orders'] as const,
  detail: (orderId: string) => ['orders', orderId] as const,
  pending: ['orders', { status: 'pending' }] as const,
}

export const pendingOrdersQueryOptions = queryOptions({
  queryKey: orderKeys.pending,
  queryFn: ({ signal }) => ordersApi.listPending(signal),
})

/** Always read from the API on mount: after a reload the REST state is the source of truth. */
export const orderQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    staleTime: 0,
  })

/**
 * The pending order that holds this cart line, if any. Its units are reserved, so the
 * quote reports the line as unavailable: the UI says "order in progress" instead.
 */
export function usePendingOrderFor() {
  const { isAuthenticated } = useSession()
  const pending = useQuery({ ...pendingOrdersQueryOptions, enabled: isAuthenticated })
  return (nftId: string, editionId: string) =>
    pending.data?.find((order) => order.lines.some((line) => line.nftId === nftId && line.editionId === editionId))?.id
}

/** One purchase attempt: the exact request and its idempotency key, for a retry that changes nothing. */
export type Attempt = {
  key: string
  userId: string
  body: CreateOrderRequest
  /** The cart lines the order buys: the body only has a quote id. Absent in attempts saved before this field. */
  lines?: { nftId: string; editionId: string }[]
}

const ATTEMPT_KEY = 'kurio.checkout.attempt'
const listeners = new Set<() => void>()

/**
 * The attempt is written to sessionStorage before the request goes out and
 * removed only on a definitive answer, so a reload in the middle cannot lose it.
 * `unresolved` is what the UI sees: the attempt whose answer never arrived
 * (timeout, dropped connection, 5xx, or a reload while it was in flight).
 */
let unresolved: Attempt | null = load()
/** Any attempt without a definitive answer, including the one whose first request is still in flight. */
let held: Attempt | null = unresolved

function load(): Attempt | null {
  try {
    const value = sessionStorage.getItem(ATTEMPT_KEY)
    return value ? (JSON.parse(value) as Attempt) : null
  } catch {
    // Storage unavailable or an old format: no attempt to recover.
    return null
  }
}

function save(attempt: Attempt | null, visible: Attempt | null) {
  held = attempt
  unresolved = visible
  try {
    if (attempt) sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt))
    else sessionStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // Storage blocked: the in-memory attempt still protects retries in this tab.
  }
  listeners.forEach((listener) => listener())
}

/** Starts a new attempt for this request. It stays hidden while the first request is in flight. */
export function startAttempt(userId: string, body: CreateOrderRequest, lines: Attempt['lines']): Attempt {
  const attempt = { key: crypto.randomUUID(), userId, body, lines }
  save(attempt, null)
  return attempt
}

/**
 * True when the units of this cart line are reserved by the user's own order: one
 * already pending, or an attempt that may have created it (its response is lost or
 * still in flight). The reservation lowers the availability, which is not a sell-out.
 */
export function isHeldByOwnOrder(queryClient: QueryClient, nftId: string, editionId: string): boolean {
  const same = (line: { nftId: string; editionId: string }) => line.nftId === nftId && line.editionId === editionId
  if (held?.lines?.some(same)) return true
  return queryClient.getQueryData<Order[]>(orderKeys.pending)?.some((order) => order.lines.some(same)) ?? false
}

/** The attempt of this user still waiting for a definitive answer, or null. */
export function useUnresolvedAttempt(userId: string): Attempt | null {
  const attempt = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => unresolved,
    () => null,
  )
  return attempt?.userId === userId ? attempt : null
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attempt: Attempt) => ordersApi.create(attempt.body, attempt.key),
    onSuccess: (order) => {
      save(null, null)
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      // Known at once, so the attempt handing over to the pending list leaves no gap
      // in which the order's own reservation looks like a sell-out.
      if (order.status === 'pending') {
        queryClient.setQueryData<Order[]>(orderKeys.pending, (list) => [order, ...(list ?? []).filter((o) => o.id !== order.id)])
      }
      void queryClient.invalidateQueries({ queryKey: orderKeys.pending, exact: true })
    },
    // A transient failure (timeout, connection, 5xx) says nothing about the
    // order: the attempt stays and becomes unresolved. Any other answer means no
    // order was created with this request, so the next submission starts anew.
    onError: (error, attempt) => {
      if (isApiError(error) && error.isTransient) save(attempt, attempt)
      else save(null, null)
    },
  })
}
