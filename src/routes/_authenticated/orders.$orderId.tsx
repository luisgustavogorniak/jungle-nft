import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { isApiError } from '@/api/http'
import { orderQueryOptions } from '@/features/orders/queries'
import { errorMessage } from '@/lib/form-errors'
import { formatEth } from '@/lib/eth'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderPage,
})

/**
 * The state always comes from GET /api/orders/:id (also after a reload);
 * `order.updated` events then update the same cache entry. The receipt is
 * rendered only for an order the simulation actually confirmed.
 */
function OrderPage() {
  const { orderId } = Route.useParams()
  const order = useQuery(orderQueryOptions(orderId))

  if (order.isPending) return <main className="p-8" role="status">Carregando pedido…</main>
  if (order.isError) {
    const notFound = isApiError(order.error) && order.error.code === 'NOT_FOUND'
    return (
      <main className="grid justify-items-start gap-2 p-8">
        <h1 className="text-xl font-bold">{notFound ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
        {!notFound && <p role="alert">{errorMessage(order.error)}</p>}
        <Link to="/" className="underline">
          Voltar ao início
        </Link>
      </main>
    )
  }

  const data = order.data

  if (data.status === 'pending') {
    return (
      <main className="grid gap-2 p-8">
        <h1 className="text-xl font-bold">Pagamento em processamento</h1>
        <p role="status" data-testid="order-status">
          Aguardando a confirmação da rede. Você pode recarregar a página: o pedido não será duplicado.
        </p>
      </main>
    )
  }

  if (data.status === 'declined') {
    return (
      <main className="grid justify-items-start gap-2 p-8">
        <h1 className="text-xl font-bold">Pagamento recusado</h1>
        <p role="alert" data-testid="order-status">
          {data.declineReason ?? 'O pagamento não foi concluído.'} Seus itens continuam no carrinho.
        </p>
        <Link to="/cart" className="underline">
          Voltar ao carrinho
        </Link>
      </main>
    )
  }

  return (
    <main className="grid max-w-xl gap-4 p-8">
      <h1 className="text-xl font-bold" data-testid="order-status">
        Seus NFTs agora estão na sua carteira
      </h1>
      <dl className="grid grid-cols-2 gap-2">
        <dt>ID da transação</dt>
        <dd data-testid="order-tx">
          {data.txHash!.slice(0, 6)}…{data.txHash!.slice(-4)}
        </dd>
        <dt>Data</dt>
        <dd>{new Date(data.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</dd>
        <dt>Total</dt>
        <dd data-testid="order-total">{formatEth(data.total)}</dd>
        <dt>Carteira</dt>
        <dd>
          {data.walletAddress.slice(0, 6)}…{data.walletAddress.slice(-4)}
        </dd>
      </dl>
      <section aria-labelledby="tx-details">
        <h2 id="tx-details" className="font-bold">
          Detalhes da transação
        </h2>
        <ul aria-label="Itens comprados">
          {data.lines.map((line) => (
            <li key={`${line.nftId}-${line.editionId}`}>
              {line.name} ({line.editionLabel}) × {line.quantity} · {formatEth(line.lineTotal)}
            </li>
          ))}
        </ul>
        <p>Taxa de rede: {formatEth(data.networkFee)}</p>
      </section>
      {data.explorerUrl && (
        <a href={data.explorerUrl} target="_blank" rel="noreferrer" className="underline">
          Ver no Etherscan (simulado)
        </a>
      )}
    </main>
  )
}
