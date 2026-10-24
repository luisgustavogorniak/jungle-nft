import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { EditionId } from '@/api/contracts'
import { isApiError } from '@/api/http'
import { Button } from '@/components/ui/button'
import { useAddToCart } from '@/features/cart/queries'
import { nftQueryOptions } from '@/features/catalog/queries'
import { errorMessage } from '@/lib/form-errors'
import { formatEth } from '@/lib/eth'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery(nftQueryOptions(nftId))
  const addToCart = useAddToCart()
  const [editionId, setEditionId] = useState<EditionId | null>(null)
  const [quantity, setQuantity] = useState(1)

  if (nft.isPending) return <main className="p-8" role="status">Carregando NFT…</main>
  if (nft.isError) {
    const notFound = isApiError(nft.error) && nft.error.code === 'NOT_FOUND'
    return (
      <main className="grid justify-items-start gap-2 p-8">
        <h1 className="text-xl font-bold">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1>
        {!notFound && <p role="alert">{errorMessage(nft.error)}</p>}
        <Link to="/" className="underline">
          Voltar ao catálogo
        </Link>
      </main>
    )
  }

  const data = nft.data
  const selected = data.editions.find((edition) => edition.id === editionId) ?? null
  const max = selected?.available ?? 1

  const onAdd = () => {
    if (!selected) return
    addToCart.mutate(
      { nftId: data.id, editionId: selected.id, quantity },
      {
        onSuccess: () => toast.success(`${data.name} adicionado ao carrinho`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }

  return (
    <main className="grid gap-4 p-8 md:grid-cols-2">
      <img src={data.image} alt={data.name} width={444} height={444} className="aspect-square w-full max-w-md object-cover" />
      <div className="grid content-start gap-3">
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <p className="text-xl font-bold">{formatEth(data.price)}</p>
        <p>{data.description}</p>

        <fieldset className="grid gap-1">
          <legend className="font-semibold">Edição:</legend>
          {data.editions.map((edition) => (
            <label key={edition.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="edition"
                value={edition.id}
                disabled={edition.available === 0}
                checked={editionId === edition.id}
                onChange={() => {
                  setEditionId(edition.id)
                  setQuantity(1)
                }}
              />
              {edition.label}
              <span className="text-sm">{edition.available === 0 ? '(esgotada)' : `(${edition.available} disponíveis)`}</span>
            </label>
          ))}
        </fieldset>

        <label className="grid w-32 gap-1">
          Quantidade
          <input
            type="number"
            min={1}
            max={max}
            value={quantity}
            disabled={!selected}
            onChange={(event) => setQuantity(Math.min(max, Math.max(1, Math.trunc(Number(event.target.value)) || 1)))}
            className="border px-2 py-1"
          />
        </label>

        <dl className="text-sm">
          <dt className="inline">ID do token: </dt>
          <dd className="inline">{data.tokenId}</dd>
          <br />
          <dt className="inline">Coleção: </dt>
          <dd className="inline">{data.collection}</dd>
        </dl>

        <div className="flex gap-2">
          <Button disabled={!selected || addToCart.isPending} onClick={onAdd}>
            {addToCart.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/cart">Ver carrinho</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
