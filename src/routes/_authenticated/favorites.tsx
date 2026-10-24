import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { NftCard } from '@/features/catalog/nft-card'
import { nftQueryOptions } from '@/features/catalog/queries'
import { useFavorites } from '@/features/favorites/queries'

export const Route = createFileRoute('/_authenticated/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const nfts = useQueries({ queries: ids.map((id) => nftQueryOptions(id)) })
  const loaded = nfts.flatMap((query) => (query.data ? [query.data] : []))

  return (
    <main>
      <Container className="grid gap-8 py-8 md:py-12">
        <h1 className="text-xl font-bold md:text-[28px]">Favoritos</h1>
        {favorites.isPending && <p role="status">Carregando favoritos…</p>}
        {favorites.isError && <p role="alert">Não foi possível carregar seus favoritos.</p>}
        {favorites.data && ids.length === 0 && (
          <div className="grid justify-items-start gap-3 bg-card p-6">
            <p className="font-bold">Você ainda não favoritou nenhum NFT.</p>
            <Button asChild variant="outline">
              <Link to="/">Explorar o catálogo</Link>
            </Button>
          </div>
        )}
        {loaded.length > 0 && (
          <ul aria-label="Favoritos" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12 xl:grid-cols-4">
            {loaded.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  )
}
