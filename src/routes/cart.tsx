import { createFileRoute, Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CartRow, ROW_COLUMNS } from '@/features/cart/cart-row'
import { CouponForm } from '@/features/cart/coupon-form'
import { OrderSummary, OrderSummarySkeleton } from '@/features/cart/order-summary'
import { cartQueryOptions, useCartQuote } from '@/features/cart/queries'
import { NftShelf } from '@/features/catalog/nft-shelf'
import { PendingOrderNotice } from '@/features/orders/pending-order-notice'
import { usePendingOrderFor } from '@/features/orders/queries'
import { errorMessage } from '@/lib/form-errors'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  const cart = useQuery(cartQueryOptions)
  const items = cart.data?.items ?? []
  const hasItems = items.length > 0
  const quote = useCartQuote(hasItems)

  const issues = quote.data?.issues ?? []
  const issueFor = (nftId: string, editionId: string) =>
    issues.find((issue) => issue.nftId === nftId && issue.editionId === editionId)?.message
  const pendingOrderFor = usePendingOrderFor()
  const onlyReserved = issues.every((issue) => pendingOrderFor(issue.nftId, issue.editionId))
  // Totals of a stale quote (or one with problems) must not lead to checkout.
  const blocked = quote.isPlaceholderData || issues.length > 0

  return (
    <main>
      <Container className="grid gap-6 py-4 max-md:pb-0 md:gap-4 md:pt-[30px] md:pb-6">
        <div className="grid grid-cols-[35px_1fr_35px] items-center md:contents">
          <Button
            type="button"
            variant="circle"
            size="icon-xs"
            aria-label="Voltar"
            className="size-[35px]! px-0! md:hidden"
            onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/' }))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-center text-xl font-bold md:sr-only">Carrinho de NFTs</h1>
        </div>
        <nav aria-label="Você está em" className="hidden text-[15px] font-bold md:block">
          <Link to="/" className="hover:text-highlight">
            Início
          </Link>
          {' / '}
          <Link to="/" hash="catalogo" className="hover:text-highlight">
            Mercado
          </Link>
          {' / '}
          <span aria-current="page">Carrinho</span>
        </nav>

        <PendingOrderNotice />

        {cart.isPending && <CartSkeleton />}
        {cart.isError && (
          <div role="alert" className="grid justify-items-start gap-3 bg-card p-6">
            <p className="font-bold">Não foi possível carregar o carrinho.</p>
            <p className="text-copy">{errorMessage(cart.error)}</p>
            <Button variant="outline" onClick={() => void cart.refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}
        {cart.data && !hasItems && (
          <div className="grid justify-items-start gap-3 bg-card p-6">
            <p className="font-bold">Seu carrinho está vazio.</p>
            <Button asChild variant="outline">
              <Link to="/">Continuar explorando</Link>
            </Button>
          </div>
        )}

        {hasItems && (
          <div className="grid gap-6 max-md:min-h-[calc(100dvh-4.75rem)] max-md:grid-rows-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-x-[86px] lg:gap-y-8">
            <section aria-labelledby="items-title" className="grid content-start gap-3">
              <h2 id="items-title" className="sr-only">
                Itens do carrinho
              </h2>
              <div aria-hidden="true" className={`hidden ${ROW_COLUMNS} border-b border-primary/40 pb-3 font-bold md:grid`}>
                <span>NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
                <span />
              </div>
              <ul aria-label="Itens do carrinho" className="grid gap-3 md:gap-3">
                {items.map((item) => (
                  <CartRow
                    key={`${item.nftId}-${item.editionId}`}
                    item={item}
                    issue={issueFor(item.nftId, item.editionId)}
                    pendingOrderId={pendingOrderFor(item.nftId, item.editionId)}
                  />
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="summary-title"
              className="grid content-start gap-5 max-md:sticky max-md:bottom-0 max-md:z-30 max-md:-mx-6 max-md:max-h-[75dvh] max-md:overflow-y-auto max-md:rounded-t-[40px] max-md:bg-card max-md:px-6 max-md:pt-6 max-md:pb-[max(2rem,env(safe-area-inset-bottom))] max-md:shadow-tabbar"
            >
              <h2 id="summary-title" className="border-b border-primary/40 pb-3 text-lg font-bold max-md:sr-only">
                Resumo da carteira
              </h2>
              <CouponForm quote={quote.data} />
              {quote.isPending && <OrderSummarySkeleton />}
              {quote.isError && !quote.data && <p role="alert">{errorMessage(quote.error)}</p>}
              {quote.data && <OrderSummary quote={quote.data} busy={quote.isPlaceholderData} />}
              {blocked && issues.length > 0 && (
                <p id="checkout-help" role="status" className="text-sm text-destructive">
                  {onlyReserved
                    ? 'Aguarde a confirmação do pedido em andamento para continuar.'
                    : 'Ajuste ou remova os itens indisponíveis para continuar.'}
                </p>
              )}
              {blocked ? (
                <Button
                  type="button"
                  variant="pill"
                  size="xl"
                  disabled
                  aria-describedby={issues.length > 0 ? 'checkout-help' : undefined}
                  className="md:h-10 md:rounded-[3px] md:bg-primary md:bg-none"
                >
                  Conectar e finalizar
                </Button>
              ) : (
                <Button asChild variant="pill" size="xl" className="md:h-10 md:rounded-[3px] md:bg-primary md:bg-none">
                  <Link to="/checkout">Conectar e finalizar</Link>
                </Button>
              )}
              <Link to="/" className="text-center text-highlight hover:underline max-md:hidden">
                Continuar explorando
              </Link>
            </section>
          </div>
        )}

        {hasItems && <NftShelf title="Colecionadores também viram" exclude={items.map((item) => item.nftId)} />}
      </Container>
    </main>
  )
}

/** Same boxes as rows and summary, so loading does not shift the layout. */
function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-x-[86px]">
      <div className="grid content-start gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[100px] w-full rounded-[14px] md:h-[70px] md:rounded-none" />
        ))}
      </div>
      <div className="grid content-start gap-4">
        <Skeleton className="h-10 w-full" />
        <OrderSummarySkeleton />
      </div>
    </div>
  )
}
