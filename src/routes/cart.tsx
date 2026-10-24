import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { OrderSummary } from '@/features/cart/order-summary'
import { cartQueryOptions, quoteQueryOptions } from '@/features/cart/queries'
import { errorMessage } from '@/lib/form-errors'
import { formatEth, mulEth } from '@/lib/eth'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

// Thin slice: read-only cart. Quantity editing, removal and coupon come in E5.
function CartPage() {
  const cart = useQuery(cartQueryOptions)
  const hasItems = (cart.data?.items.length ?? 0) > 0
  const quote = useQuery({ ...quoteQueryOptions(null), enabled: hasItems })

  return (
    <main className="grid gap-4 p-8">
      <h1 className="text-2xl font-semibold">Carrinho de NFTs</h1>
      {cart.isPending && <p role="status">Carregando carrinho…</p>}
      {cart.isError && <p role="alert">{errorMessage(cart.error)}</p>}
      {cart.data && !hasItems && (
        <p>
          Seu carrinho está vazio.{' '}
          <Link to="/" className="underline">
            Continuar explorando
          </Link>
        </p>
      )}
      {hasItems && (
        <>
          <ul aria-label="Itens do carrinho" className="grid gap-2">
            {cart.data!.items.map((item) => (
              <li key={`${item.nftId}-${item.editionId}`} className="flex flex-wrap items-center gap-4 border p-2">
                <img src={item.image} alt="" width={56} height={56} className="size-14 object-cover" />
                <div className="grid">
                  <span className="font-bold">{item.name}</span>
                  <span className="text-sm">
                    ID do token: {item.tokenId} · Edição: {item.editionLabel}
                  </span>
                </div>
                <span>{formatEth(item.unitPrice)}</span>
                <span>× {item.quantity}</span>
                <span className="font-bold">{formatEth(mulEth(item.unitPrice, item.quantity))}</span>
              </li>
            ))}
          </ul>
          <section aria-labelledby="summary-title" className="grid max-w-sm gap-2">
            <h2 id="summary-title" className="font-bold">
              Resumo da carteira
            </h2>
            {quote.isPending && <p role="status">Calculando valores…</p>}
            {quote.isError && <p role="alert">{errorMessage(quote.error)}</p>}
            {quote.data && <OrderSummary quote={quote.data} />}
            <Button asChild>
              <Link to="/checkout">Conectar e finalizar</Link>
            </Button>
          </section>
        </>
      )}
    </main>
  )
}
