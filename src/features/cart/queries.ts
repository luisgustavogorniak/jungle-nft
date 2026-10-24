import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { cartApi } from '@/api/commerce'

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
