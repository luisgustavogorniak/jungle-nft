import { useEffect } from 'react'
import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cartApi } from '@/api/commerce'
import type { Cart, EditionId } from '@/api/contracts'
import { isApiError } from '@/api/http'
import { errorMessage } from '@/lib/form-errors'
import { setCoupon, useCoupon } from './coupon'

export const cartKeys = {
  cart: ['cart'] as const,
  quotes: ['quote'] as const,
  quote: (couponCode: string | null) => ['quote', { couponCode }] as const,
}

export const cartQueryOptions = queryOptions({
  queryKey: cartKeys.cart,
  queryFn: ({ signal }) => cartApi.get(signal),
})

/** The API quote is the reference for totals; it is re-requested whenever the cart changes. */
export const quoteQueryOptions = (couponCode: string | null) =>
  queryOptions({
    queryKey: cartKeys.quote(couponCode),
    queryFn: ({ signal }) => cartApi.quote(couponCode, signal),
    staleTime: 0,
  })

export function useAddToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cartApi.addItem,
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.cart, cart)
      void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
    },
  })
}

/** Number of distinct items in the cart, for the header and tab bar badges. */
export function useCartCount(): number {
  const { data } = useQuery({ ...cartQueryOptions, select: (cart) => cart.items.length })
  return data ?? 0
}

/**
 * The quote for the cart with the applied coupon. The previous totals stay on screen while
 * a new quote loads. A coupon the server no longer accepts (expired meanwhile) is dropped.
 */
export function useCartQuote(enabled = true) {
  const coupon = useCoupon()
  const query = useQuery({ ...quoteQueryOptions(coupon), enabled, placeholderData: keepPreviousData })
  const error = query.error
  useEffect(() => {
    if (coupon && isApiError(error) && (error.code === 'COUPON_INVALID' || error.code === 'COUPON_EXPIRED')) {
      setCoupon(null)
      toast.info(`${error.message}. O cupom foi removido.`)
    }
  }, [coupon, error])
  return query
}

/** Validates a code with a quote request; only an accepted code is kept. */
export function useApplyCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => cartApi.quote(code),
    onSuccess: (quote, code) => {
      queryClient.setQueryData(cartKeys.quote(quote.coupon?.code ?? code), quote)
      setCoupon(quote.coupon?.code ?? code)
    },
  })
}

type LineRef = { nftId: string; editionId: EditionId }

/**
 * Cart line edits are optimistic: the row changes at once, the previous cart is restored if
 * the API refuses, and the server cart and quote are re-read when the last edit in flight ends.
 */
function useCartEdit<Variables extends LineRef>(
  mutationFn: (variables: Variables) => Promise<Cart>,
  apply: (cart: Cart, variables: Variables) => Cart,
  failure: string,
) {
  const queryClient = useQueryClient()
  const mutationKey = ['cart', 'edit'] as const
  return useMutation({
    mutationKey,
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.cart })
      const previous = queryClient.getQueryData<Cart>(cartKeys.cart)
      if (previous) queryClient.setQueryData(cartKeys.cart, apply(previous, variables))
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(cartKeys.cart, context.previous)
      toast.error(`${failure}. ${errorMessage(error)}`)
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: cartKeys.cart })
        void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
      }
    },
  })
}

const sameLine = (a: LineRef, b: LineRef) => a.nftId === b.nftId && a.editionId === b.editionId

export function useUpdateCartItem() {
  return useCartEdit(
    (v: LineRef & { quantity: number }) => cartApi.updateItem(v.nftId, v.editionId, v.quantity),
    (cart, v) => ({ ...cart, items: cart.items.map((item) => (sameLine(item, v) ? { ...item, quantity: v.quantity } : item)) }),
    'Não foi possível alterar a quantidade',
  )
}

export function useRemoveCartItem() {
  return useCartEdit(
    (v: LineRef) => cartApi.removeItem(v.nftId, v.editionId),
    (cart, v) => ({ ...cart, items: cart.items.filter((item) => !sameLine(item, v)) }),
    'Não foi possível remover o item',
  )
}
