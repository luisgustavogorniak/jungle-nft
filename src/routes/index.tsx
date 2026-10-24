import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { nftListQueryOptions } from '@/features/catalog/queries'
import { errorMessage } from '@/lib/form-errors'
import { formatEth } from '@/lib/eth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Thin slice: first page of the catalog. Search, filters and pagination come in E4.
function HomePage() {
  const catalog = useQuery(nftListQueryOptions({ page: 1 }))

  return (
    <main className="grid gap-4 p-8">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      {catalog.isPending && <p role="status">Carregando NFTs…</p>}
      {catalog.isError && (
        <div role="alert" className="grid justify-items-start gap-2">
          <p>{errorMessage(catalog.error)}</p>
          <Button variant="outline" onClick={() => void catalog.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {catalog.data?.items.length === 0 && <p>Nenhum NFT encontrado.</p>}
      {catalog.data && catalog.data.items.length > 0 && (
        <ul aria-label="NFTs" className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {catalog.data.items.map((nft) => (
            <li key={nft.id}>
              <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="grid gap-2">
                <img src={nft.image} alt={nft.name} width={258} height={258} loading="lazy" className="aspect-square w-full object-cover" />
                <span>{nft.name}</span>
                <span className="font-bold">{formatEth(nft.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
