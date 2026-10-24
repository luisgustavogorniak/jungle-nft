import { z } from 'zod'
import {
  cartSchema,
  nftListResponseSchema,
  nftSchema,
  orderSchema,
  quoteSchema,
  walletSchema,
  type Cart,
  type CartItemInput,
  type CreateOrderRequest,
  type Nft,
  type NftListQuery,
  type NftListResponse,
  type Order,
  type Quote,
  type Wallet,
} from './contracts'
import { http, IDEMPOTENCY_HEADER } from './http'

export const catalogApi = {
  async list(query: NftListQuery, signal?: AbortSignal): Promise<NftListResponse> {
    const { data } = await http.get('/nfts', { params: query, signal })
    return nftListResponseSchema.parse(data)
  },

  async get(nftId: string, signal?: AbortSignal): Promise<Nft> {
    const { data } = await http.get(`/nfts/${encodeURIComponent(nftId)}`, { signal })
    return nftSchema.parse(data)
  },
}

export const cartApi = {
  async get(signal?: AbortSignal): Promise<Cart> {
    const { data } = await http.get('/cart', { signal })
    return cartSchema.parse(data)
  },

  async addItem(item: CartItemInput): Promise<Cart> {
    const { data } = await http.post('/cart/items', item)
    return cartSchema.parse(data)
  },

  async quote(couponCode: string | null, signal?: AbortSignal): Promise<Quote> {
    const { data } = await http.post('/quote', { couponCode }, { signal })
    return quoteSchema.parse(data)
  },
}

export const walletsApi = {
  async list(signal?: AbortSignal): Promise<Wallet[]> {
    const { data } = await http.get('/wallets', { signal })
    return z.array(walletSchema).parse(data)
  },
}

export const ordersApi = {
  async create(body: CreateOrderRequest, idempotencyKey: string): Promise<Order> {
    const { data } = await http.post('/orders', body, { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } })
    return orderSchema.parse(data)
  },

  async get(orderId: string, signal?: AbortSignal): Promise<Order> {
    const { data } = await http.get(`/orders/${encodeURIComponent(orderId)}`, { signal })
    return orderSchema.parse(data)
  },
}
