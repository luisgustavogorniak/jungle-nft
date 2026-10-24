import { queryOptions } from '@tanstack/react-query'
import { catalogApi } from '@/api/commerce'
import type { NftListQuery } from '@/api/contracts'
import type { CatalogSearch } from './search'

export const catalogKeys = {
  all: ['nfts'] as const,
  list: (query: NftListQuery) => ['nfts', 'list', query] as const,
  detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
}

/** The URL state is the API query: the key (and so the cache entry) follows the filters. */
export const toListQuery = (search: CatalogSearch): NftListQuery => search

export const nftListQueryOptions = (query: NftListQuery) =>
  queryOptions({
    queryKey: catalogKeys.list(query),
    queryFn: ({ signal }) => catalogApi.list(query, signal),
  })

export const nftQueryOptions = (nftId: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(nftId),
    queryFn: ({ signal }) => catalogApi.get(nftId, signal),
  })
