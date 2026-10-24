// Catalog changes of the simulated backend. Every change bumps the NFT version
// and is broadcast as `nft.updated`, so REST responses and events always agree.
import type { EditionId, NftUpdatedEvent } from '@/api/contracts'
import { addEth, percentOfEth } from '@/lib/eth'
import { findNft, getCartRecord } from './commerce'
import { nextEventId, saveDb } from './db'
import { broadcast } from './realtime'

export type NftChanges = { price?: string; editions?: { id: EditionId; available: number }[] }

/** Publishes the current state of an NFT whose record was already changed. */
export function publishNftUpdate(nftId: string) {
  const nft = findNft(nftId)
  if (!nft) return
  nft.version += 1
  const event: NftUpdatedEvent = {
    eventId: nextEventId(),
    type: 'nft.updated',
    resourceId: nft.id,
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      price: nft.price,
      oldPrice: nft.oldPrice,
      editions: nft.editions.map(({ id, available }) => ({ id, available })),
    },
  }
  saveDb()
  broadcast('nft.updated', event)
}

/** Changes price and/or availability (mock control and scenarios). */
export function updateNft(nftId: string, changes: NftChanges) {
  const nft = findNft(nftId)
  if (!nft) throw new Error(`Unknown NFT "${nftId}"`)
  if (changes.price) nft.price = changes.price
  for (const change of changes.editions ?? []) {
    const edition = nft.editions.find((candidate) => candidate.id === change.id)
    if (edition) edition.available = change.available
  }
  publishNftUpdate(nftId)
}

let priceChangeArmed = true

/**
 * `price-change` scenario: some seconds after the first quote of the page load,
 * the first item of that cart gets more expensive. Once per page load.
 */
export function schedulePriceChange(ownerKey: string, delayMs: number, percent: number) {
  if (!priceChangeArmed) return
  const first = getCartRecord(ownerKey).items[0]
  if (!first) return
  priceChangeArmed = false
  setTimeout(() => {
    const nft = findNft(first.nftId)
    if (nft) updateNft(nft.id, { price: addEth(nft.price, percentOfEth(nft.price, percent * 100)) })
  }, delayMs)
}
