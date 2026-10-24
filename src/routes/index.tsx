import { createFileRoute } from '@tanstack/react-router'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { nftListQueryOptions, toListQuery } from '@/features/catalog/queries'
import { parseCatalogSearch } from '@/features/catalog/search'
import { Blog } from '@/features/home/blog'
import { Hero } from '@/features/home/hero'
import { Promos } from '@/features/home/promos'

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

function HomePage() {
  return (
    <main>
      <Hero />
      <CatalogSection />
      <Promos />
      <Blog />
    </main>
  )
}
