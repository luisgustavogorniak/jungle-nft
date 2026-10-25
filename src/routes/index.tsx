import { createFileRoute } from '@tanstack/react-router'
import { nftListQueryOptions, toListQuery } from '@/features/catalog/queries'
import { parseCatalogSearch } from '@/features/catalog/search'
import { HomePage } from '@/features/home/home-page'

export const Route = createFileRoute('/')({
  validateSearch: parseCatalogSearch,
  loaderDeps: ({ search }) => ({ search: parseCatalogSearch(search) }),
  // Starts the request early (also on link hover) without blocking the transition:
  // the page shows skeletons while the data arrives.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQueryOptions(toListQuery(deps.search)))
  },
  component: HomePage,
})
