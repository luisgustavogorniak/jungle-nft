import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { activeFilterCount, cleanSearch, parseCatalogSearch } from '@/features/catalog/search'
import { parseSearch, stringifySearch } from '@/lib/search-params'

describe('search params encoding', () => {
  it('uses repeated keys for arrays and round-trips', () => {
    const search = { categories: ['music', 'photography'], sort: 'price-asc', page: 2 }
    const text = stringifySearch(search)
    assert.equal(text, '?categories=music&categories=photography&sort=price-asc&page=2')
    assert.deepEqual(parseSearch(text), { categories: ['music', 'photography'], sort: 'price-asc', page: '2' })
  })

  it('omits empty values', () => {
    assert.equal(stringifySearch({ q: '', page: undefined, categories: [] }), '')
  })
})

describe('catalog search validation', () => {
  it('parses every supported field', () => {
    const search = parseCatalogSearch(
      parseSearch('?q=ape&categories=music&categories=3d-art&networks=solana&minPrice=0.5&maxPrice=2&tab=new&sort=popular&page=3'),
    )
    assert.deepEqual(search, {
      q: 'ape',
      categories: ['music', '3d-art'],
      networks: ['solana'],
      minPrice: '0.5',
      maxPrice: '2',
      tab: 'new',
      sort: 'popular',
      page: 3,
    })
  })

  it('accepts a single value for list fields', () => {
    assert.deepEqual(parseCatalogSearch({ categories: 'music' }).categories, ['music'])
  })

  it('ignores invalid values without dropping the valid ones', () => {
    const search = parseCatalogSearch({
      categories: ['music', 'foo'],
      page: 'abc',
      sort: 'cheapest',
      minPrice: '1,5',
      q: 'ape',
    })
    assert.deepEqual(search, { categories: ['music'], q: 'ape' })
  })

  it('rejects non positive pages', () => {
    assert.equal(parseCatalogSearch({ page: '0' }).page, undefined)
    assert.equal(parseCatalogSearch({ page: '-2' }).page, undefined)
  })

  it('cleans empty values and counts active filters', () => {
    assert.deepEqual(cleanSearch({ q: '', categories: [], page: 2 }), { page: 2 })
    assert.equal(activeFilterCount({ categories: ['music', 'gaming'], networks: ['solana'], minPrice: '1' }), 4)
  })
})

describe('pagination window', () => {
  it('shows first, last and neighbours with gaps', async () => {
    const { pageWindow } = await import('@/features/catalog/page-window')
    assert.deepEqual(pageWindow(1, 4), [1, 2, 'gap', 4])
    assert.deepEqual(pageWindow(5, 10), [1, 'gap', 4, 5, 6, 'gap', 10])
    assert.deepEqual(pageWindow(2, 3), [1, 2, 3])
  })
})
