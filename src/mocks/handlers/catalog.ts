import { http, HttpResponse } from 'msw'
import {
  categoryIds,
  networkIds,
  nftListQuerySchema,
  type NftListQuery,
  type NftListResponse,
} from '@/api/contracts'
import { compareEth } from '@/lib/eth'
import { db } from '../db'
import { findNft } from '../commerce'
import type { NftRecord } from '../fixtures/nfts'
import { getScenario } from '../scenarios'
import { errorResponse, toNft, withScenario } from '../utils'

const DEFAULT_PAGE_SIZE = 9
const TRENDING_THRESHOLD = 50

/** Reads the query string and validates it against the contract; invalid input is a 422. */
function readQuery(url: URL): { query: NftListQuery } | { error: Response } {
  const params = url.searchParams
  const number = (name: string) => (params.has(name) ? Number(params.get(name)) : undefined)
  const list = (name: string) => (params.has(name) ? params.getAll(name) : undefined)
  const parsed = nftListQuerySchema.safeParse({
    q: params.get('q') ?? undefined,
    categories: list('categories'),
    networks: list('networks'),
    minPrice: params.get('minPrice') ?? undefined,
    maxPrice: params.get('maxPrice') ?? undefined,
    tab: params.get('tab') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: number('page'),
    pageSize: number('pageSize'),
  })
  if (parsed.success) return { query: parsed.data }

  const fieldErrors: Record<string, string> = {}
  for (const issue of parsed.error.issues) fieldErrors[issue.path.join('.') || 'query'] ??= issue.message
  return { error: errorResponse('VALIDATION_ERROR', 'Parâmetros de busca inválidos', { fieldErrors }) }
}

type FacetGroup = 'categories' | 'networks'

function matches(nft: NftRecord, query: NftListQuery, skip?: FacetGroup): boolean {
  if (query.q) {
    const haystack = `${nft.name} ${nft.collection} ${nft.creator} ${nft.tokenId}`.toLowerCase()
    const needle = query.q.toLowerCase().replace(/^#/, '')
    if (!haystack.includes(needle)) return false
  }
  if (skip !== 'categories' && query.categories && !query.categories.includes(nft.category)) return false
  if (skip !== 'networks' && query.networks && !query.networks.includes(nft.network)) return false
  if (query.minPrice && compareEth(nft.price, query.minPrice) < 0) return false
  if (query.maxPrice && compareEth(nft.price, query.maxPrice) > 0) return false
  if (query.tab === 'new' && !nft.isNewRelease) return false
  if (query.tab === 'trending' && nft.trendingScore < TRENDING_THRESHOLD) return false
  return true
}

function compare(sort: NonNullable<NftListQuery['sort']>) {
  return (a: NftRecord, b: NftRecord) => {
    const byId = a.id.localeCompare(b.id)
    switch (sort) {
      case 'price-asc':
        return compareEth(a.price, b.price) || byId
      case 'price-desc':
        return compareEth(b.price, a.price) || byId
      case 'popular':
        return b.trendingScore - a.trendingScore || byId
      default:
        return b.listedAt.localeCompare(a.listedAt) || byId
    }
  }
}

export const catalogHandlers = [
  http.get(
    '/api/nfts',
    withScenario('catalog.list', ({ request }) => {
      const result = readQuery(new URL(request.url))
      if ('error' in result) return result.error
      const { query } = result

      const catalog = getScenario().emptyCatalog ? [] : db().nfts
      const sort = query.sort ?? (query.tab === 'trending' ? 'popular' : 'recent')
      const filtered = catalog.filter((nft) => matches(nft, query)).sort(compare(sort))

      const page = query.page ?? 1
      const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
      const prices = db().nfts.map((nft) => nft.price).sort(compareEth)

      // Each facet counts the NFTs that match every filter except its own group,
      // so the user can see what selecting another option would return.
      const countBy = <K extends string>(ids: readonly K[], group: FacetGroup, field: 'category' | 'network') =>
        Object.fromEntries(
          ids.map((id) => [id, catalog.filter((nft) => matches(nft, query, group) && nft[field] === id).length]),
        ) as Record<K, number>

      const response: NftListResponse = {
        items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toNft),
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
        facets: {
          categories: countBy(categoryIds, 'categories', 'category'),
          networks: countBy(networkIds, 'networks', 'network'),
          priceRange: { min: prices[0] ?? '0.00', max: prices.at(-1) ?? '0.00' },
        },
      }
      return HttpResponse.json(response)
    }),
  ),

  http.get(
    '/api/nfts/:nftId',
    withScenario('catalog.detail', ({ params }) => {
      const nft = findNft(String(params.nftId))
      if (!nft) return errorResponse('NOT_FOUND', 'NFT não encontrado')
      return HttpResponse.json(toNft(nft))
    }),
  ),
]
