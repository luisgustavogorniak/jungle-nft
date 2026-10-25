import { z } from 'zod'
import {
  cartSchema,
  favoritesSchema,
  nftListResponseSchema,
  nftSchema,
  orderSchema,
  quoteSchema,
  walletConnectionSchema,
  walletSchema,
  type Cart,
  type CartItemInput,
  type CreateOrderRequest,
  type Favorites,
  type Nft,
  type NftListQuery,
  type NftListResponse,
  type Order,
  type Quote,
  type Wallet,
  type WalletConnection,
  type WalletConnectionRequest,
  type WalletInput,
  type WalletSlot,
} from './contracts'
import { http, IDEMPOTENCY_HEADER } from './http'

export const catalogApi = {
  async list(query: NftListQuery, signal?: AbortSignal): Promise<NftListResponse> {
    // Arrays are sent as repeated keys (categories=a&categories=b), like the page URL.
    const { data } = await http.get('/nfts', { params: query, signal, paramsSerializer: { indexes: null } })
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

  async updateItem(nftId: string, editionId: string, quantity: number): Promise<Cart> {
    const { data } = await http.patch(`/cart/items/${encodeURIComponent(nftId)}/${editionId}`, { quantity })
    return cartSchema.parse(data)
  },

  async removeItem(nftId: string, editionId: string): Promise<Cart> {
    const { data } = await http.delete(`/cart/items/${encodeURIComponent(nftId)}/${editionId}`)
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

  /** Creates or replaces the wallet of a slot (a user has one primary and one secondary). */
  async save(slot: WalletSlot, body: WalletInput): Promise<Wallet> {
    const { data } = await http.put(`/wallets/${slot}`, body)
    return walletSchema.parse(data)
  },

  async connect(walletId: string, body: WalletConnectionRequest): Promise<WalletConnection> {
    const { data } = await http.post(`/wallets/${encodeURIComponent(walletId)}/connect`, body)
    return walletConnectionSchema.parse(data)
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

  async listPending(signal?: AbortSignal): Promise<Order[]> {
    const { data } = await http.get('/orders', { params: { status: 'pending' }, signal })
    return z.array(orderSchema).parse(data)
  },

  /** The order created with this Idempotency-Key, or null when the server has none. */
  async findByAttempt(idempotencyKey: string, signal?: AbortSignal): Promise<Order | null> {
    const { data } = await http.get('/orders', { params: { idempotencyKey }, signal })
    return z.array(orderSchema).parse(data)[0] ?? null
  },
}

export const favoritesApi = {
  async list(signal?: AbortSignal): Promise<Favorites> {
    const { data } = await http.get('/favorites', { signal })
    return favoritesSchema.parse(data)
  },

  async add(nftId: string): Promise<Favorites> {
    const { data } = await http.put(`/favorites/${encodeURIComponent(nftId)}`)
    return favoritesSchema.parse(data)
  },

  async remove(nftId: string): Promise<Favorites> {
    const { data } = await http.delete(`/favorites/${encodeURIComponent(nftId)}`)
    return favoritesSchema.parse(data)
  },
}
