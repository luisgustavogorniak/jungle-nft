import { createFileRoute, Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { walletsApi } from '@/api/commerce'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cartQueryOptions, useCartQuote } from '@/features/cart/queries'
import { CheckoutForm } from '@/features/checkout/checkout-form'
import { PendingOrderNotice } from '@/features/orders/pending-order-notice'
import { useUnresolvedAttempt } from '@/features/orders/queries'
import { UnresolvedOrder } from '@/features/orders/unresolved-order'
import { errorMessage } from '@/lib/form-errors'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const { session } = Route.useRouteContext()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  const quote = useCartQuote()
  const cart = useQuery(cartQueryOptions)
  const wallets = useQuery({ queryKey: ['wallets', session.user.id], queryFn: ({ signal }) => walletsApi.list(signal) })
  const attempt = useUnresolvedAttempt(session.user.id)

  const failed = quote.isError && !quote.data ? quote : wallets.isError ? wallets : null

  return (
    <main>
      <Container className="grid gap-6 py-4 md:gap-8 md:pt-[30px] md:pb-6">
        <div className="grid grid-cols-[35px_1fr_35px] items-center md:contents">
          <Button
            type="button"
            variant="circle"
            size="icon-xs"
            aria-label="Voltar"
            className="size-[35px]! px-0! md:hidden"
            onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/cart' }))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-center text-xl font-bold md:sr-only">Pagamento com carteira</h1>
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
          <span aria-current="page">Pagamento</span>
        </nav>

        {/* An unresolved attempt replaces the form, whatever the cart says: its order may exist. */}
        {attempt ? (
          <UnresolvedOrder attempt={attempt} />
        ) : (
          <PendingOrderNotice />
        )}

        {attempt ? null : failed ? (
          <div role="alert" className="grid justify-items-start gap-3 bg-card p-6">
            <p className="font-bold">Não foi possível carregar o pagamento.</p>
            <p className="text-copy">{errorMessage(failed.error)}</p>
            <Button variant="outline" onClick={() => void failed.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !quote.data || !cart.data || !wallets.data ? (
          <div role="status" aria-label="Carregando pagamento" className="grid gap-6 lg:grid-cols-[minmax(0,763px)_405px] lg:justify-between">
            <Skeleton className="h-[420px] w-full" />
            <Skeleton className="h-[420px] w-full" />
          </div>
        ) : quote.data.lines.length === 0 ? (
          <div className="grid justify-items-start gap-3 bg-card p-6">
            <p className="font-bold">Seu carrinho está vazio.</p>
            <Button asChild variant="outline">
              <Link to="/">Continuar explorando</Link>
            </Button>
          </div>
        ) : wallets.data.length === 0 ? (
          <div className="grid justify-items-start gap-3 bg-card p-6">
            <p className="font-bold">Cadastre uma carteira para pagar.</p>
            <Button asChild variant="outline">
              <Link to="/profile">Ir para o perfil</Link>
            </Button>
          </div>
        ) : (
          <CheckoutForm quote={{ ...quote, data: quote.data }} items={cart.data.items} wallets={wallets.data} user={session.user} />
        )}
      </Container>
    </main>
  )
}
