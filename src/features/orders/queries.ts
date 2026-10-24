import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/api/commerce'
import type { CreateOrderRequest } from '@/api/contracts'
import { isApiError } from '@/api/http'

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

const ATTEMPT_KEY = 'kurio.checkout.attempt'
let memoryKey: string | null = null

/**
 * The idempotency key of the current purchase attempt. It is kept (in
 * sessionStorage, so it survives a reload) until the attempt gets a definitive
 * answer: after a timeout or a dropped connection the order may exist, and any
 * new submission must reuse the key to recover it instead of buying twice.
 */
export function attemptKey(): string {
  try {
    memoryKey = sessionStorage.getItem(ATTEMPT_KEY) ?? memoryKey
  } catch {
    // Storage unavailable: the in-memory key still protects retries in this tab.
  }
  memoryKey ??= crypto.randomUUID()
  try {
    sessionStorage.setItem(ATTEMPT_KEY, memoryKey)
  } catch {
    // Same as above.
  }
  return memoryKey
}

function finishAttempt() {
  memoryKey = null
  try {
    sessionStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // Nothing stored.
  }
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateOrderRequest; idempotencyKey: string }) =>
      ordersApi.create(body, idempotencyKey),
    onSuccess: (order) => {
      finishAttempt()
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      void queryClient.invalidateQueries({ queryKey: orderKeys.pending, exact: true })
    },
    // A transient failure (timeout, connection, 5xx) says nothing about the
    // order: the key stays. Any other answer means no order was created with
    // this request, so the next submission starts a new attempt.
    onError: (error) => {
      if (!isApiError(error) || !error.isTransient) finishAttempt()
    },
  })
}
