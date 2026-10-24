import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { walletsApi } from '@/api/commerce'
import { networkIds, walletProviders, type NetworkId, type Quote, type WalletProvider } from '@/api/contracts'
import { isApiError } from '@/api/http'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { OrderSummary } from '@/features/cart/order-summary'
import { cartKeys, useCartQuote } from '@/features/cart/queries'
import { idempotencyKeyFor, useCreateOrder } from '@/features/orders/queries'
import { compareEth, formatEth } from '@/lib/eth'
import { errorMessage } from '@/lib/form-errors'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

const networkLabels: Record<NetworkId, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }
const providerLabels: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

/** Same lines, prices and totals. Every quote request gets a new id, so ids are not compared. */
function sameQuote(a: Quote, b: Quote): boolean {
  return (
    compareEth(a.total, b.total) === 0 &&
    compareEth(a.discount, b.discount) === 0 &&
    compareEth(a.networkFee, b.networkFee) === 0 &&
    a.issues.length === b.issues.length &&
    a.lines.length === b.lines.length &&
    a.lines.every((line, index) => {
      const other = b.lines[index]
      return (
        line.nftId === other.nftId &&
        line.editionId === other.editionId &&
        line.quantity === other.quantity &&
        compareEth(line.unitPrice, other.unitPrice) === 0
      )
    })
  )
}

// Thin slice: minimal checkout. Full validation, review step, wallet simulation
// and quote revalidation UX come in E7.
function CheckoutPage() {
  const { session } = Route.useRouteContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const quote = useCartQuote()
  const wallets = useQuery({ queryKey: ['wallets', session.user.id], queryFn: ({ signal }) => walletsApi.list(signal) })
  const createOrder = useCreateOrder()

  const [walletId, setWalletId] = useState<string | null>(null)
  const [provider, setProvider] = useState<WalletProvider>('metamask')
  const [network, setNetwork] = useState<NetworkId>('ethereum')
  const [displayName, setDisplayName] = useState(session.user.displayName)
  const [username, setUsername] = useState(session.user.username)
  const [email, setEmail] = useState(session.user.email)
  const [error, setError] = useState<string | null>(null)

  const selectedWallet = wallets.data?.find((wallet) => wallet.id === walletId) ?? null

  // The quote the user has seen. A newer quote with different values (e.g. after
  // `nft.updated`) blocks the purchase until the user accepts it; a quote being
  // re-requested or with availability issues blocks it too.
  const [reviewedQuote, setReviewedQuote] = useState<Quote | null>(null)
  if (quote.data && !reviewedQuote) setReviewedQuote(quote.data)
  const quoteChanged = Boolean(quote.data && reviewedQuote && !sameQuote(quote.data, reviewedQuote))
  const blocked = quoteChanged || quote.isFetching || (quote.data?.issues.length ?? 0) > 0

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!quote.data || !selectedWallet || createOrder.isPending || blocked) return
    setError(null)
    createOrder.mutate(
      {
        body: {
          quoteId: quote.data.id,
          walletId: selectedWallet.id,
          network,
          provider,
          collector: { displayName, username, email, note: null },
        },
        idempotencyKey: idempotencyKeyFor(quote.data.id),
      },
      {
        onSuccess: (order) => void navigate({ to: '/orders/$orderId', params: { orderId: order.id } }),
        onError: (mutationError) => {
          setError(errorMessage(mutationError))
          if (isApiError(mutationError) && mutationError.code === 'QUOTE_CHANGED') {
            void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
          }
        },
      },
    )
  }

  if (quote.isPending) return <main className="p-8" role="status">Calculando valores…</main>
  if (quote.isError) return <main className="p-8" role="alert">{errorMessage(quote.error)}</main>
  if (quote.data.lines.length === 0) {
    return (
      <main className="p-8">
        <p>
          Seu carrinho está vazio.{' '}
          <Link to="/" className="underline">
            Continuar explorando
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-semibold">Pagamento</h1>
      <form noValidate onSubmit={onSubmit} className="grid max-w-xl gap-4" aria-label="Pagamento">
        <fieldset className="grid gap-3">
          <legend className="font-bold">Perfil do colecionador</legend>
          <TextField label="Nome de exibição" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <TextField label="Nome de usuário" required value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </fieldset>

        <fieldset className="grid gap-1">
          <legend className="font-bold">Carteira</legend>
          {wallets.isPending && <p role="status">Carregando carteiras…</p>}
          {wallets.data?.map((wallet) => (
            <label key={wallet.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="wallet"
                checked={walletId === wallet.id}
                onChange={() => {
                  setWalletId(wallet.id)
                  setNetwork(wallet.network)
                  setProvider(wallet.provider)
                }}
              />
              {wallet.nickname} · {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
            </label>
          ))}
        </fieldset>

        <fieldset className="grid gap-1">
          <legend className="font-bold">Carteira e rede</legend>
          {walletProviders.map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input type="radio" name="provider" checked={provider === option} onChange={() => setProvider(option)} />
              {providerLabels[option]}
            </label>
          ))}
          <label className="mt-2 grid gap-1">
            Rede
            <select value={network} onChange={(e) => setNetwork(e.target.value as NetworkId)} className="border px-2 py-1">
              {networkIds.map((id) => (
                <option key={id} value={id}>
                  {networkLabels[id]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <section aria-labelledby="checkout-summary" className="grid gap-2">
          <h2 id="checkout-summary" className="font-bold">
            Seus NFTs
          </h2>
          <OrderSummary quote={quote.data} />
        </section>

        {quote.data.issues.map((issue) => (
          <p key={`${issue.nftId}-${issue.editionId}`} role="alert">
            {issue.message}
          </p>
        ))}
        {quoteChanged && reviewedQuote && (
          <div role="alert" className="grid gap-3 rounded-md border border-highlight p-4">
            <p>
              Os valores mudaram desde a sua revisão. Total anterior: {formatEth(reviewedQuote.total)}. Novo total:{' '}
              {formatEth(quote.data.total)}.
            </p>
            <Button type="button" variant="outline" disabled={quote.isFetching} onClick={() => setReviewedQuote(quote.data)}>
              Aceitar novo valor
            </Button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={!selectedWallet || createOrder.isPending || blocked}>
          {createOrder.isPending ? 'Enviando pedido…' : quote.isFetching ? 'Atualizando valores…' : 'Confirmar compra'}
        </Button>
      </form>
    </main>
  )
}
