// Cart and quote rules of the simulated backend, shared by handlers.
import type { Cart, CartItemInput, Edition, EditionId, Quote, QuoteIssue, QuoteLine } from '@/api/contracts'
import { addEth, compareEth, mulEth, percentOfEth, subEth } from '@/lib/eth'
import { db, type CartRecord, type QuoteRecord } from './db'
import { coupons, NETWORK_FEE } from './fixtures/commerce'
import type { NftRecord } from './fixtures/nfts'
import { resolveNftImage } from './images'
import { errorResponse } from './utils'

const QUOTE_TTL_MS = 10 * 60 * 1000

export function findNft(nftId: string): NftRecord | undefined {
  return db().nfts.find((nft) => nft.id === nftId)
}

export function findEdition(nft: NftRecord, editionId: EditionId): Edition | undefined {
  return nft.editions.find((edition) => edition.id === editionId)
}

export function getCartRecord(ownerKey: string): CartRecord {
  return db().carts[ownerKey] ?? { items: [], updatedAt: new Date(0).toISOString() }
}

export function setCartItems(ownerKey: string, items: CartItemInput[]) {
  db().carts[ownerKey] = { items, updatedAt: new Date().toISOString() }
}

/** Cart joined with the current catalog: price and availability are always live. */
export function toCart(ownerKey: string): Cart {
  const record = getCartRecord(ownerKey)
  const items = record.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft && findEdition(nft, item.editionId)
    if (!nft || !edition) return []
    return [
      {
        ...item,
        name: nft.name,
        tokenId: nft.tokenId,
        image: resolveNftImage(nft.imageFile, 'thumb'),
        editionLabel: edition.label,
        unitPrice: nft.price,
        available: edition.available,
        nftVersion: nft.version,
      },
    ]
  })
  return { items, updatedAt: record.updatedAt }
}

/** Throws 404/409 when the NFT, edition or requested quantity is not available. */
export function assertAvailable(item: CartItemInput) {
  const nft = findNft(item.nftId)
  if (!nft) throw errorResponse('NOT_FOUND', 'NFT não encontrado')
  const edition = findEdition(nft, item.editionId)
  if (!edition) throw errorResponse('NOT_FOUND', 'Edição não encontrada')
  if (item.quantity > edition.available) {
    throw errorResponse(
      'AVAILABILITY_CONFLICT',
      edition.available === 0
        ? `A edição ${edition.label} de ${nft.name} está esgotada`
        : `Restam apenas ${edition.available} unidade(s) da edição ${edition.label} de ${nft.name}`,
      { details: { nftId: nft.id, editionId: edition.id, available: edition.available } },
    )
  }
}

/** Moves the visitor cart into the user cart on login, capped by availability. */
export function mergeGuestCart(guestKey: string | null, userKey: string) {
  if (!guestKey) return
  const guest = db().carts[guestKey]
  if (!guest || guest.items.length === 0) return
  const merged = [...getCartRecord(userKey).items]
  for (const item of guest.items) {
    const nft = findNft(item.nftId)
    const edition = nft && findEdition(nft, item.editionId)
    if (!edition) continue
    const existing = merged.find((m) => m.nftId === item.nftId && m.editionId === item.editionId)
    if (existing) existing.quantity = Math.min(existing.quantity + item.quantity, edition.available)
    else merged.push({ ...item, quantity: Math.min(item.quantity, edition.available) })
  }
  setCartItems(
    userKey,
    merged.filter((item) => item.quantity > 0),
  )
  delete db().carts[guestKey]
}

function findCoupon(code: string) {
  const coupon = coupons.find((candidate) => candidate.code === code.trim().toUpperCase())
  if (!coupon) throw errorResponse('COUPON_INVALID', 'Código promocional inválido', { fieldErrors: { couponCode: 'Código promocional inválido' } })
  if (new Date(coupon.expiresAt).getTime() <= Date.now()) {
    throw errorResponse('COUPON_EXPIRED', 'Este código promocional expirou', { fieldErrors: { couponCode: 'Este código promocional expirou' } })
  }
  return coupon
}

/** Prices the current cart. Quantities above availability are reported as issues. */
export function priceCart(ownerKey: string, couponCode: string | null) {
  const cart = toCart(ownerKey)
  const lines: QuoteLine[] = cart.items.map((item) => ({
    nftId: item.nftId,
    editionId: item.editionId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: mulEth(item.unitPrice, item.quantity),
  }))
  const issues: QuoteIssue[] = cart.items
    .filter((item) => item.quantity > item.available)
    .map((item) => ({
      nftId: item.nftId,
      editionId: item.editionId,
      kind: item.available === 0 ? 'unavailable' : 'insufficient_availability',
      message:
        item.available === 0
          ? `${item.name} (${item.editionLabel}) esgotou`
          : `Restam apenas ${item.available} unidade(s) de ${item.name} (${item.editionLabel})`,
    }))

  const coupon = couponCode ? findCoupon(couponCode) : null
  const subtotal = lines.length ? addEth(...lines.map((line) => line.lineTotal)) : '0.00'
  const discount = coupon ? percentOfEth(subtotal, coupon.percentOff * 100) : '0.00'
  const networkFee = lines.length ? NETWORK_FEE : '0.00'
  const total = addEth(subEth(subtotal, discount), networkFee)

  return {
    lines,
    subtotal,
    discount,
    networkFee,
    total,
    coupon: coupon ? { code: coupon.code, percentOff: coupon.percentOff } : null,
    issues,
  }
}

export function createQuote(ownerKey: string, couponCode: string | null): Quote {
  const priced = priceCart(ownerKey, couponCode)
  const quote: QuoteRecord = {
    id: `quote-${crypto.randomUUID()}`,
    ...priced,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    ownerKey,
  }
  db().quotes[quote.id] = quote
  const { ownerKey: _owner, ...publicQuote } = quote
  return publicQuote
}

/** True when the stored quote still matches the current cart pricing. */
export function quoteStillValid(quote: QuoteRecord): boolean {
  if (new Date(quote.expiresAt).getTime() <= Date.now()) return false
  const current = priceCart(quote.ownerKey, quote.coupon?.code ?? null)
  if (current.issues.length > 0 || compareEth(current.total, quote.total) !== 0) return false
  if (current.lines.length !== quote.lines.length) return false
  return current.lines.every((line, index) => {
    const quoted = quote.lines[index]
    return (
      line.nftId === quoted.nftId &&
      line.editionId === quoted.editionId &&
      line.quantity === quoted.quantity &&
      compareEth(line.unitPrice, quoted.unitPrice) === 0
    )
  })
}
