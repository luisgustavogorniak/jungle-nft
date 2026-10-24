import { http, HttpResponse } from 'msw'
import { categoryIds, networkIds, type NftListResponse } from '@/api/contracts'
import { compareEth } from '@/lib/eth'
import { db } from '../db'
import { findNft } from '../commerce'
import { getScenario } from '../scenarios'
import { errorResponse, toNft, withScenario } from '../utils'

const DEFAULT_PAGE_SIZE = 9

export const catalogHandlers = [
  http.get(
    '/api/nfts',
    withScenario('catalog.list', ({ request }) => {
      const params = new URL(request.url).searchParams
      const page = Math.max(1, Number(params.get('page')) || 1)
      const pageSize = Math.min(48, Math.max(1, Number(params.get('pageSize')) || DEFAULT_PAGE_SIZE))

      // Filters, search and sorting are added in E4; default order is "recently listed".
      const all = getScenario().emptyCatalog ? [] : [...db().nfts]
      all.sort((a, b) => b.listedAt.localeCompare(a.listedAt))

      const prices = all.map((nft) => nft.price).sort(compareEth)
      const response: NftListResponse = {
        items: all.slice((page - 1) * pageSize, page * pageSize).map(toNft),
        page,
        pageSize,
        total: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
        facets: {
          categories: Object.fromEntries(
            categoryIds.map((id) => [id, all.filter((nft) => nft.category === id).length]),
          ) as NftListResponse['facets']['categories'],
          networks: Object.fromEntries(
            networkIds.map((id) => [id, all.filter((nft) => nft.network === id).length]),
          ) as NftListResponse['facets']['networks'],
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
