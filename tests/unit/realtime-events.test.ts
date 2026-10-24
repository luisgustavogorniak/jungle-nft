import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import type { Cart, Nft, NftUpdatedEvent, Order, OrderUpdatedEvent } from '../../src/api/contracts.ts'
import { cartKeys } from '../../src/features/cart/queries.ts'
import { catalogKeys } from '../../src/features/catalog/queries.ts'
import { orderKeys } from '../../src/features/orders/queries.ts'
import { applyNftUpdated, applyOrderUpdated } from '../../src/realtime/events.ts'
import { buildNftFixtures } from '../../src/mocks/fixtures/nfts.ts'

const NFT_ID = 'emerald-ape-042'
let queryClient: QueryClient
let seq = 0

function nftEvent(version: number, price: string, eventId = `test-evt-${++seq}`): NftUpdatedEvent {
  return {
    eventId,
    type: 'nft.updated',
    resourceId: NFT_ID,
    version,
    occurredAt: new Date().toISOString(),
    data: { price, oldPrice: null, editions: [{ id: '1-50', available: 10 }] },
  }
}

/** The detail as the REST API returns it, with its version. */
function restNft(version: number, price: string): Nft {
  const { imageFile: _file, ...record } = buildNftFixtures().find((nft) => nft.id === NFT_ID)!
  return { ...record, image: '', thumbnail: '', version, price }
}

const cachedNft = () => queryClient.getQueryData<Nft>(catalogKeys.detail(NFT_ID))!

beforeEach(() => {
  queryClient = new QueryClient()
})

describe('nft.updated', () => {
  it('applies a newer event to the cached detail', () => {
    queryClient.setQueryData(catalogKeys.detail(NFT_ID), restNft(1, '1.19'))
    applyNftUpdated(queryClient, nftEvent(2, '1.309'))
    assert.equal(cachedNft().price, '1.309')
    assert.equal(cachedNft().version, 2)
    assert.equal(cachedNft().editions.find((edition) => edition.id === '1-50')?.available, 10)
  })

  it('ignores a duplicate event (same eventId)', () => {
    queryClient.setQueryData(catalogKeys.detail(NFT_ID), restNft(1, '1.19'))
    const event = nftEvent(2, '1.309')
    applyNftUpdated(queryClient, event)
    // Simulates a fix by REST in between: a replay must not reapply the event.
    queryClient.setQueryData(catalogKeys.detail(NFT_ID), restNft(1, '1.19'))
    applyNftUpdated(queryClient, event)
    assert.equal(cachedNft().price, '1.19')
  })

  it('never regresses to an older version', () => {
    queryClient.setQueryData(catalogKeys.detail(NFT_ID), restNft(1, '1.19'))
    applyNftUpdated(queryClient, nftEvent(3, '1.50'))
    applyNftUpdated(queryClient, nftEvent(2, '1.30'))
    assert.equal(cachedNft().price, '1.50')
    assert.equal(cachedNft().version, 3)
  })

  it('discards an event older than the state fetched by a REST reconciliation', () => {
    // After a reconnection the detail is re-read from REST at version 5 ...
    queryClient.setQueryData(catalogKeys.detail(NFT_ID), restNft(5, '2.00'))
    // ... and an event of version 4, sent before, arrives late.
    applyNftUpdated(queryClient, nftEvent(4, '1.80'))
    assert.equal(cachedNft().price, '2.00')
    assert.equal(cachedNft().version, 5)
  })

  it('uses the version of the cart too, when the NFT is not in the catalog cache', () => {
    const cart: Cart = {
      updatedAt: new Date().toISOString(),
      items: [
        {
          nftId: NFT_ID,
          editionId: '1-50',
          quantity: 2,
          name: 'Emerald Ape #042',
          tokenId: '#0042',
          image: '',
          editionLabel: '1/50',
          unitPrice: '2.00',
          available: 10,
          nftVersion: 5,
        },
      ],
    }
    queryClient.setQueryData(cartKeys.cart, cart)
    applyNftUpdated(queryClient, nftEvent(4, '1.80'))
    assert.equal(queryClient.getQueryData<Cart>(cartKeys.cart)?.items[0].unitPrice, '2.00')

    applyNftUpdated(queryClient, nftEvent(6, '2.20'))
    assert.equal(queryClient.getQueryData<Cart>(cartKeys.cart)?.items[0].unitPrice, '2.20')
  })

  it('drops payloads that do not match the contract', () => {
    queryClient.setQueryData(catalogKeys.detail(NFT_ID), restNft(1, '1.19'))
    applyNftUpdated(queryClient, { type: 'nft.updated', resourceId: NFT_ID, version: 9, data: { price: 'free' } })
    assert.equal(cachedNft().price, '1.19')
  })
})

describe('order.updated', () => {
  it('does not move a terminal order back to an older state', () => {
    const order = { id: 'order-1', status: 'confirmed', version: 2 } as Order
    queryClient.setQueryData(orderKeys.detail(order.id), order)
    const stale: OrderUpdatedEvent = {
      eventId: `test-evt-${++seq}`,
      type: 'order.updated',
      resourceId: order.id,
      version: 1,
      occurredAt: new Date().toISOString(),
      data: { status: 'pending', txHash: null, explorerUrl: null, declineReason: null },
    }
    applyOrderUpdated(queryClient, stale)
    assert.equal(queryClient.getQueryData<Order>(orderKeys.detail(order.id))?.status, 'confirmed')
  })
})
