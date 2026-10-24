import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { describe, it } from 'node:test'
import { categoryIds, nftSchema, userSchema, walletSchema } from '@/api/contracts'
import { compareEth } from '@/lib/eth'
import { buildNftFixtures } from '@/mocks/fixtures/nfts'
import { demoUsers, demoWallets } from '@/mocks/fixtures/users'

const nfts = buildNftFixtures()

describe('nft fixtures', () => {
  it('match the API contract', () => {
    for (const { imageFile, ...nft } of nfts) {
      nftSchema.parse({ ...nft, image: `/assets/${imageFile}` })
    }
  })

  it('have unique ids and token ids', () => {
    for (const key of ['id', 'tokenId'] as const) {
      assert.equal(new Set(nfts.map((nft) => nft[key])).size, nfts.length, `duplicated ${key}`)
    }
  })

  it('start with the home grid of the layout', () => {
    assert.deepEqual(
      nfts.slice(0, 3).map((nft) => [nft.name, nft.tokenId, nft.price]),
      [
        ['Emerald Ape #042', '#0042', '1.19'],
        ['Sage Nomad #009', '#0009', '1.69'],
        ['Neon Vessel #552', '#0552', '1.99'],
      ],
    )
  })

  it('use the artwork of the layout for the home grid', () => {
    assert.deepEqual(
      nfts.slice(0, 9).map((nft) => nft.imageFile),
      [
        'ape-green.png', // Emerald Ape
        'gorilla-purple.png', // Sage Nomad
        'gorilla-dark.png', // Neon Vessel
        'gorilla-purple.png', // Cosmic Bloom
        'gorilla-purple.png', // Violet Nomad
        'gorilla-dark.png', // Ivory Baron
        'orangutan.png', // Golden Beat
        'orangutan.png', // Golden Frequency
        'orangutan.png', // Golden Signal
      ],
    )
  })

  it('point every NFT to an existing image file', () => {
    for (const nft of nfts) {
      assert.ok(existsSync(new URL(`../../src/assets/nfts/${nft.imageFile}`, import.meta.url)), nft.imageFile)
    }
  })

  it('cover every category and the price range of the layout', () => {
    for (const category of categoryIds) {
      assert.equal(nfts.filter((nft) => nft.category === category).length, 4, category)
    }
    const prices = nfts.map((nft) => nft.price).sort(compareEth)
    assert.equal(prices[0], '0.02')
    assert.equal(prices.at(-1), '12.30')
  })

  it('include sold out editions', () => {
    assert.ok(nfts.some((nft) => nft.editions.some((edition) => edition.available === 0)))
  })
})

describe('user fixtures', () => {
  it('have at least two users with valid wallets', () => {
    assert.ok(demoUsers.length >= 2)
    for (const { salt: _salt, ...user } of demoUsers) userSchema.parse(user)
    for (const wallet of Object.values(demoWallets).flat()) walletSchema.parse(wallet)
  })
})
