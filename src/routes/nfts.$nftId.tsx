import { useState } from 'react'
import { createFileRoute, Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import type { Edition, EditionId, Nft, NetworkId } from '@/api/contracts'
import { isApiError } from '@/api/http'
import { Container } from '@/components/layout/container'
import { MAX_QUANTITY, QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAddToCart } from '@/features/cart/queries'
import { NftShelf } from '@/features/catalog/nft-shelf'
import { nftQueryOptions } from '@/features/catalog/queries'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { errorMessage } from '@/lib/form-errors'
import { formatEth } from '@/lib/eth'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailPage,
})

const networkLabels: Record<NetworkId, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const nft = useQuery(nftQueryOptions(nftId))

  if (nft.isPending) return <DetailSkeleton />
  if (nft.isError) {
    const notFound = isApiError(nft.error) && nft.error.code === 'NOT_FOUND'
    return (
      <main>
        <Container className="grid justify-items-start gap-3 py-16">
          <h1 className="text-xl font-bold">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar o NFT'}</h1>
          {!notFound && <p role="alert">{errorMessage(nft.error)}</p>}
          <div className="flex gap-3">
            {!notFound && (
              <Button variant="outline" onClick={() => void nft.refetch()}>
                Tentar novamente
              </Button>
            )}
            <Button asChild>
              <Link to="/">Voltar ao catálogo</Link>
            </Button>
          </div>
        </Container>
      </main>
    )
  }
  // Remount per NFT: edition and quantity start over when the user opens another one.
  return <NftDetail key={nft.data.id} nft={nft.data} />
}

function DetailSkeleton() {
  return (
    // Same grid, paddings and image box as NftDetail, so the artwork does not move when the data arrives.
    <main role="status" aria-label="Carregando NFT" className="pb-44 md:pb-0">
      <Container className="grid gap-6 md:py-6">
        <Skeleton className="hidden h-[22px] w-40 md:block" />
        <div className="grid gap-6 md:grid-cols-[100px_444px_1fr] md:gap-6">
          <div className="hidden content-start gap-4 md:grid">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="size-[100px] rounded-lg" />
            ))}
          </div>
          <div className="mt-4 md:mt-0 md:p-4">
            <Skeleton className="aspect-[361/356] w-full rounded-3xl md:aspect-square" />
          </div>
          <div className="grid content-start gap-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </Container>
    </main>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden="true" className="flex gap-0.5 text-primary">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('size-3.5', n <= Math.round(rating) && 'fill-current')} />
      ))}
    </span>
  )
}

function EditionChips({
  editions,
  value,
  onChange,
}: {
  editions: Edition[]
  value: EditionId | null
  onChange: (id: EditionId) => void
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <label
              key={edition.id}
              className={cn(
                'relative cursor-pointer rounded-full border border-transparent px-3 py-1 text-sm text-copy has-[:checked]:border-primary has-[:checked]:font-medium has-[:checked]:text-highlight has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring',
                soldOut && 'cursor-not-allowed line-through opacity-50',
              )}
            >
              <input
                type="radio"
                name="edition"
                className="sr-only"
                value={edition.id}
                disabled={soldOut}
                checked={value === edition.id}
                onChange={() => onChange(edition.id)}
              />
              {edition.label}
              <span className="sr-only">{soldOut ? ' (esgotada)' : ` (${edition.available} ${edition.available === 1 ? 'disponível' : 'disponíveis'})`}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function NftDetail({ nft }: { nft: Nft }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  const addToCart = useAddToCart()
  const [chosen, setChosen] = useState<EditionId | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [thumb, setThumb] = useState(0)

  // 1/50 (the edition the layout shows selected) is preselected while it has stock, otherwise the first
  // edition with stock; the user's choice wins while it still has stock.
  const firstAvailable =
    nft.editions.find((edition) => edition.id === '1-50' && edition.available > 0) ??
    nft.editions.find((edition) => edition.available > 0) ??
    null
  const chosenEdition = nft.editions.find((edition) => edition.id === chosen && edition.available > 0)
  const selected = chosenEdition ?? firstAvailable
  const max = selected ? Math.min(selected.available, MAX_QUANTITY) : 1
  const qty = Math.min(quantity, max)

  const add = (onDone?: () => void) => {
    if (!selected) return
    addToCart.mutate(
      { nftId: nft.id, editionId: selected.id, quantity: qty },
      {
        onSuccess: () => {
          // The mobile detail page has no tab bar, so the toast carries the way to the cart.
          toast.success(`${nft.name} adicionado ao carrinho`, {
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) },
          })
          onDone?.()
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    )
  }
  const blocked = !selected || addToCart.isPending
  const help = selected ? undefined : 'Todas as edições estão esgotadas. Volte mais tarde ou veja outros NFTs.'

  return (
    <main className="pb-44 md:pb-0">
      <Container className="grid gap-6 md:py-6">
        <nav aria-label="Você está em" className="hidden text-[15px] font-bold md:block">
          <Link to="/" className="hover:text-highlight">
            Início
          </Link>
          {' / '}
          <Link to="/" hash="catalogo" className="hover:text-highlight">
            Mercado
          </Link>
          {' / '}
          <span aria-current="page">{nft.name}</span>
        </nav>

        <div className="grid gap-6 md:grid-cols-[100px_444px_1fr] md:gap-6">
          {/* Gallery. The API has a single artwork per NFT, so the thumbnails repeat it. */}
          <ul aria-label="Imagens" className="hidden content-start gap-4 md:grid">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-label={`Imagem ${i + 1} de 4`}
                  aria-current={thumb === i}
                  onClick={() => setThumb(i)}
                  className={cn('block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring', thumb === i && 'ring-2 ring-primary')}
                >
                  <img src={nft.thumbnail} alt="" width={100} height={100} className="size-[100px] rounded-lg object-cover" />
                </button>
              </li>
            ))}
          </ul>

          <div className="relative">
            <div className="mt-4 md:mt-0 md:rounded-md md:bg-card md:p-4">
              <img src={nft.image} alt={nft.name} width={404} height={404} fetchPriority="high" className="aspect-[361/356] w-full rounded-3xl object-cover md:aspect-square" />
            </div>
            <div className="absolute inset-x-0 top-0 flex justify-between md:hidden">
              <Button
                type="button"
                variant="circle"
                aria-label="Voltar"
                className="size-[35px]! px-0!"
                onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/' }))}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <FavoriteButton nftId={nft.id} name={nft.name} variant="floating" />
            </div>
          </div>

          <div className="relative z-0 -mx-6 -mt-10 grid content-start gap-3 rounded-t-[31px] bg-card px-6 pt-8 md:m-0 md:gap-4 md:rounded-none md:bg-transparent md:p-0">
            <div className="flex items-start justify-between gap-3 md:block">
              <h1 className="text-xl font-bold md:text-[28px]">{nft.name}</h1>
              <p className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-sm font-bold md:hidden">
                <Star aria-hidden="true" className="size-3.5 fill-primary text-primary" />
                <span>
                  {nft.rating.toFixed(1)}
                  <span className="font-normal"> ({nft.reviewsCount})</span>
                </span>
                <span className="sr-only">avaliação média, {nft.reviewsCount} avaliações</span>
              </p>
            </div>

            <div className="hidden items-center justify-between gap-3 border-b border-border pb-3 md:flex">
              <p className="text-[22px] font-bold text-highlight">{formatEth(nft.price)}</p>
              <p className="flex items-center gap-2 text-sm">
                <Stars rating={nft.rating} />
                {nft.reviewsCount} avaliações de colecionadores
              </p>
            </div>

            <div className="grid gap-1">
              <h2 className="hidden font-bold md:block">Sobre este NFT:</h2>
              <p className="text-sm leading-6 text-copy md:text-[15px]">{nft.description}</p>
            </div>

            <EditionChips
              editions={nft.editions}
              value={selected?.id ?? null}
              onChange={(id) => {
                setChosen(id)
                setQuantity(1)
              }}
            />

            {/* Mobile: fixed buy bar. Desktop: a row below the edition. */}
            <div className="fixed inset-x-0 bottom-0 z-40 grid gap-4 rounded-t-[40px] bg-card px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card md:static md:z-auto md:flex md:items-center md:justify-between md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
              <div className="flex items-center justify-between md:gap-6">
                <QuantityStepper value={qty} max={max} caption disabled={!selected} onChange={setQuantity} />
                <p className="text-xl font-bold text-highlight md:hidden">{formatEth(nft.price)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="pill"
                  size="xl"
                  className="flex-1 md:h-10 md:flex-none md:rounded-md md:bg-primary md:bg-none md:px-6 md:text-sm"
                  disabled={blocked}
                  aria-describedby={help ? 'buy-help' : undefined}
                  onClick={() => add(() => void navigate({ to: '/cart' }))}
                >
                  <span className="md:hidden">Comprar NFT</span>
                  <span className="max-md:hidden">COMPRAR</span>
                </Button>
                <Button
                  type="button"
                  variant="circle"
                  size="icon"
                  className="size-[60px] shrink-0 md:size-10"
                  aria-label="Adicionar ao carrinho"
                  disabled={blocked}
                  aria-describedby={help ? 'buy-help' : undefined}
                  onClick={() => add()}
                >
                  <ShoppingCart className="size-5" />
                </Button>
                <FavoriteButton nftId={nft.id} name={nft.name} variant="text" className="hidden md:inline-flex" />
              </div>
              {help && (
                <p id="buy-help" role="status" className="text-sm text-destructive md:basis-full">
                  {help}
                </p>
              )}
            </div>

            <dl className="grid gap-1 text-[15px] text-copy">
              <div>
                <dt className="inline">ID do token: </dt>
                <dd className="inline">{nft.tokenId}</dd>
              </div>
              <div>
                <dt className="inline">Coleção: </dt>
                <dd className="inline">{nft.collection}</dd>
              </div>
              <div>
                <dt className="inline">Atributos: </dt>
                <dd className="inline">{nft.attributes.join(', ')}</dd>
              </div>
            </dl>
          </div>
        </div>

        <DetailTabs nft={nft} />
        <NftShelf title="Mais desta coleção" nft={nft} />
      </Container>
    </main>
  )
}

function DetailTabs({ nft }: { nft: Nft }) {
  const network = networkLabels[nft.network]
  return (
    <Tabs defaultValue="details" className="hidden gap-6 md:flex">
      <TabsList variant="line" className="h-auto w-full justify-start gap-8 border-b border-border">
        <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
        <TabsTrigger value="reviews">Avaliações de colecionadores ({nft.reviewsCount})</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="grid gap-4 text-sm leading-6 text-copy">
        <p>{nft.details}</p>
        <p>
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de
          procedência registrada na rede. {nft.creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos
          trabalhos e lançamentos da comunidade.
        </p>
        <div>
          <h3 className="font-bold text-foreground">Rede:</h3>
          <p>Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.</p>
        </div>
        <div>
          <h3 className="font-bold text-foreground">Contrato:</h3>
          <p>{nft.contract} • Contrato inteligente ERC-721 verificado.</p>
        </div>
        <div>
          <h3 className="font-bold text-foreground">Direitos autorais:</h3>
          <p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
        </div>
      </TabsContent>
      <TabsContent value="reviews" className="text-sm text-copy">
        <p>As avaliações dos colecionadores ainda não estão disponíveis nesta demonstração.</p>
      </TabsContent>
    </Tabs>
  )
}

