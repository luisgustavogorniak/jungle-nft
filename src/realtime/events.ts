// Applies realtime events to the query cache. Events are validated against the
// contract, deduplicated by eventId and ignored when older than the cached version.
import type { QueryClient } from '@tanstack/react-query'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type Cart,
  type CartItem,
  type Nft,
  type NftListResponse,
  type NftUpdatedEvent,
  type Order,
} from '@/api/contracts'
import { setCoupon } from '@/features/cart/coupon'
import { cartKeys } from '@/features/cart/queries'
import { catalogKeys } from '@/features/catalog/queries'
import { orderKeys } from '@/features/orders/queries'
import { compareEth, formatEth } from '@/lib/eth'
import { announce } from './announcements'

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

  void queryClient.invalidateQueries({ queryKey: orderKeys.pending, exact: true })
  // A confirmed order removed the purchased items from the server cart and used
  // the coupon: the next cart starts without it. A declined one keeps both.
  if (event.data.status === 'confirmed') {
    setCoupon(null)
    void queryClient.invalidateQueries({ queryKey: cartKeys.cart })
    void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
  }
}

type CatalogData = Nft | NftListResponse

/**
 * Highest version of this NFT held by any cache (detail, lists, cart). REST
 * responses carry the version too, so after a reconciliation a late event
 * older than the fetched state is still recognized as stale.
 */
function knownVersion(queryClient: QueryClient, nftId: string): number {
  let version = 0
  for (const [, data] of queryClient.getQueriesData<CatalogData>({ queryKey: catalogKeys.all })) {
    const nfts = data && 'items' in data ? data.items : data ? [data] : []
    for (const nft of nfts) if (nft.id === nftId) version = Math.max(version, nft.version)
  }
  for (const item of queryClient.getQueryData<Cart>(cartKeys.cart)?.items ?? []) {
    if (item.nftId === nftId) version = Math.max(version, item.nftVersion)
  }
  return version
}

function patchNft(nft: Nft, event: NftUpdatedEvent): Nft {
  return {
    ...nft,
    price: event.data.price,
    oldPrice: event.data.oldPrice,
    editions: nft.editions.map((edition) => ({
      ...edition,
      available: event.data.editions.find((change) => change.id === edition.id)?.available ?? edition.available,
    })),
    version: event.version,
  }
}

/** What changed for a cart line, worded for the user, or null when it does not matter. */
function describeCartChange(item: CartItem, event: NftUpdatedEvent): string | null {
  const name = `${item.name} (${item.editionLabel})`
  const available = event.data.editions.find((edition) => edition.id === item.editionId)?.available ?? item.available
  if (available < item.quantity) {
    return available === 0 ? `${name} esgotou.` : `Restam apenas ${available} unidade(s) de ${name}.`
  }
  if (compareEth(item.unitPrice, event.data.price) !== 0) {
    return `O preço de ${name} mudou de ${formatEth(item.unitPrice)} para ${formatEth(event.data.price)}.`
  }
  return null
}

export function applyNftUpdated(queryClient: QueryClient, payload: unknown) {
  const parsed = nftUpdatedEventSchema.safeParse(payload)
  if (!parsed.success || !firstTimeSeen(parsed.data.eventId)) return
  const event = parsed.data
  if (event.version <= knownVersion(queryClient, event.resourceId)) return // stale or already applied

  queryClient.setQueriesData<CatalogData>({ queryKey: catalogKeys.all }, (data) => {
    if (!data) return data
    if ('items' in data) {
      return { ...data, items: data.items.map((nft) => (nft.id === event.resourceId ? patchNft(nft, event) : nft)) }
    }
    return data.id === event.resourceId ? patchNft(data, event) : data
  })

  const cart = queryClient.getQueryData<Cart>(cartKeys.cart)
  const lines = cart?.items.filter((item) => item.nftId === event.resourceId) ?? []
  if (!cart || lines.length === 0) return

  const changes = lines.map((item) => describeCartChange(item, event)).filter((change) => change !== null)
  if (changes.length > 0) announce(`Seu carrinho foi atualizado. ${changes.join(' ')} O resumo foi recalculado.`)

  queryClient.setQueryData<Cart>(cartKeys.cart, {
    ...cart,
    items: cart.items.map((item) =>
      item.nftId === event.resourceId
        ? {
            ...item,
            unitPrice: event.data.price,
            available: event.data.editions.find((edition) => edition.id === item.editionId)?.available ?? item.available,
            nftVersion: event.version,
          }
        : item,
    ),
  })
  // Totals only come from the API: the cart and its quote are re-read.
  void queryClient.invalidateQueries({ queryKey: cartKeys.cart })
  void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
}
