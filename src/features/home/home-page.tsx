import { Container } from '@/components/layout/container'
import { CatalogSection, CatalogToolbar } from '@/features/catalog/catalog-section'
import { useIsDesktop } from '@/lib/use-media-query'
import { Blog } from './blog'
import { Hero } from './hero'
import { Promos } from './promos'

export function HomePage() {
  const isDesktop = useIsDesktop()
  return (
    <main>
      {/* Mobile layout: search and filters come before the hero. On desktop the toolbar lives inside the catalog. */}
      {!isDesktop && (
        <Container className="pt-6">
          <CatalogToolbar />
        </Container>
      )}
      <Hero />
      <CatalogSection />
      <Promos />
      <Blog />
    </main>
  )
}
