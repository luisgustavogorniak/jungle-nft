import { queryOptions } from '@tanstack/react-query'
import { catalogApi } from '@/api/commerce'
import type { NftListQuery } from '@/api/contracts'

export const catalogKeys = {
  all: ['nfts'] as const,
  list: (query: NftListQuery) => ['nfts', 'list', query] as const,
  detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
}

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
