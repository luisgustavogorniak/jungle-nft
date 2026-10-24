import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { walletsApi } from '@/api/commerce'
import {
  networkIds,
  networkSchema,
  walletProviderSchema,
  type CartItem,
  type Quote,
  type User,
  type Wallet,
} from '@/api/contracts'
import { isApiError } from '@/api/http'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { OrderSummary } from '@/features/cart/order-summary'
import { cartKeys } from '@/features/cart/queries'
import { attemptKey, orderKeys, useCreateOrder } from '@/features/orders/queries'
import { compareEth, formatEth } from '@/lib/eth'
import { errorMessage } from '@/lib/form-errors'
import { useIsDesktop } from '@/lib/use-media-query'
import { CheckoutLines } from './checkout-lines'
import { networkLabels, providerLabels, shortAddress } from './labels'
import { ProviderOptionsDesktop, ProviderOptionsMobile, WalletCards } from './wallet-options'

const checkoutSchema = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome de exibição'),
  username: z
    .string()
    .trim()
    .min(3, 'Use pelo menos 3 caracteres')
    .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, ponto e sublinhado'),
  email: z.email('Informe um e-mail válido'),
  note: z.string().max(280, 'Use no máximo 280 caracteres'),
  walletId: z.string().min(1, 'Selecione uma carteira'),
  network: networkSchema,
  provider: walletProviderSchema,
})
type CheckoutValues = z.infer<typeof checkoutSchema>

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

type Props = {
  quote: UseQueryResult<Quote> & { data: Quote }
  items: CartItem[]
  wallets: Wallet[]
  user: User
}

/**
 * Edit → connect the wallet → review → confirm. Confirming re-reads the quote
 * first: if anything changed, the user has to accept the new values before the
 * order is sent.
 */
export function CheckoutForm({ quote, items, wallets, user }: Props) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const primary = wallets.find((wallet) => wallet.slot === 'primary') ?? wallets[0]

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      note: '',
      walletId: primary.id,
      network: primary.network,
      provider: primary.provider,
    },
  })
  const { errors } = form.formState
  const [walletId, network, provider] = useWatch({ control: form.control, name: ['walletId', 'network', 'provider'] })
  const wallet = wallets.find((candidate) => candidate.id === walletId) ?? primary

  const selectWallet = (next: Wallet) => {
    form.setValue('walletId', next.id)
    form.setValue('network', next.network)
    form.setValue('provider', next.provider)
  }

  // Simulated wallet connection. Changing wallet, provider or network drops it.
  const connect = useMutation({
    mutationFn: () => walletsApi.connect(walletId, { provider, network }),
  })
  const connection = connect.data
  const connected =
    connection?.walletId === walletId && connection.provider === provider && connection.network === network

  const [step, setStep] = useState<'edit' | 'review'>('edit')
  const reviewing = step === 'review' && connected
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (reviewing) reviewHeading.current?.focus()
  }, [reviewing])

  // The quote the user has seen. A newer quote with different values (e.g. after
  // `nft.updated`) blocks the purchase until the user accepts it; a quote being
  // re-requested or with availability issues blocks it too.
  const [reviewedQuote, setReviewedQuote] = useState<Quote>(quote.data)
  const quoteChanged = !sameQuote(quote.data, reviewedQuote)
  const blocked = quoteChanged || quote.isFetching || quote.data.issues.length > 0

  const createOrder = useCreateOrder()
  const [confirming, setConfirming] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const canRetry = createOrder.isError && isApiError(createOrder.error) && createOrder.error.isTransient

  const orderCallbacks = {
    onSuccess: (order: { id: string }) => void navigate({ to: '/orders/$orderId', params: { orderId: order.id } }),
    onError: (mutationError: Error) => {
      submitting.current = false
      if (isApiError(mutationError) && mutationError.code === 'QUOTE_CHANGED') {
        void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
      }
      if (isApiError(mutationError) && mutationError.code === 'IDEMPOTENCY_CONFLICT') {
        setError('Já existe um pedido criado nesta tentativa com outros dados. Confira o pedido pendente antes de comprar de novo.')
        void queryClient.invalidateQueries({ queryKey: orderKeys.pending, exact: true })
        return
      }
      setError(errorMessage(mutationError))
    },
  }

  const confirm = async () => {
    if (submitting.current || blocked) return
    submitting.current = true
    setError(null)
    setConfirming(true)
    const fresh = await quote.refetch()
    setConfirming(false)
    if (fresh.isError || !fresh.data) {
      submitting.current = false
      setError(errorMessage(fresh.error))
      return
    }
    // Something changed since the review: the alert asks for a new confirmation.
    if (!sameQuote(fresh.data, reviewedQuote) || fresh.data.issues.length > 0) {
      submitting.current = false
      return
    }
    const values = form.getValues()
    createOrder.mutate(
      {
        body: {
          quoteId: fresh.data.id,
          walletId: values.walletId,
          network: values.network,
          provider: values.provider,
          collector: {
            displayName: values.displayName,
            username: values.username,
            email: values.email,
            note: values.note.trim() || null,
          },
        },
        idempotencyKey: attemptKey(),
      },
      orderCallbacks,
    )
  }

  // After a timeout the order may exist: the same request goes again, with the same key.
  const retry = () => {
    if (submitting.current || !createOrder.variables) return
    submitting.current = true
    setError(null)
    createOrder.mutate(createOrder.variables, orderCallbacks)
  }

  const onPrimary = () => {
    if (!connected) return connect.mutate()
    if (canRetry) return retry()
    if (reviewing) return void confirm()
    void form.handleSubmit(() => setStep('review'))()
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onPrimary()
  }

  const busy = connect.isPending || confirming || createOrder.isPending
  const primaryLabel = connect.isPending
    ? 'Conectando…'
    : !connected
      ? 'Conectar carteira'
      : confirming
        ? 'Verificando valores…'
        : createOrder.isPending
          ? 'Enviando pedido…'
          : canRetry
            ? 'Tentar novamente'
            : reviewing
              ? 'Confirmar compra'
              : quote.isFetching
                ? 'Atualizando valores…'
                : 'Revisar pedido'

  const collectorFields = (
    <>
      <TextField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
      <TextField
        label="Nome de usuário"
        required
        autoComplete="username"
        error={errors.username?.message}
        {...form.register('username')}
      />
    </>
  )
  const networkField = (
    <div className="grid gap-1.5">
      <Label htmlFor="checkout-network">
        Rede<span aria-hidden="true" className="text-coral">*</span>
      </Label>
      <select
        id="checkout-network"
        {...form.register('network')}
        className="h-10 rounded-sm border border-input bg-transparent px-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {networkIds.map((id) => (
          <option key={id} value={id} className="bg-card">
            {networkLabels[id]}
          </option>
        ))}
      </select>
    </div>
  )
  const emailField = (
    <TextField label="E-mail" type="email" required autoComplete="email" error={errors.email?.message} {...form.register('email')} />
  )
  const noteField = (
    <div className="grid gap-1.5">
      <Label htmlFor="checkout-note">Observação do colecionador (opcional)</Label>
      <textarea
        id="checkout-note"
        rows={6}
        aria-invalid={errors.note ? true : undefined}
        aria-describedby={errors.note ? 'checkout-note-error' : undefined}
        {...form.register('note')}
        className="min-h-[152px] w-full max-w-[350px] rounded-sm border border-input bg-transparent p-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none aria-invalid:border-destructive"
      />
      {errors.note && (
        <p id="checkout-note-error" className="text-xs text-destructive">
          {errors.note.message}
        </p>
      )}
    </div>
  )

  const review = (
    <section aria-labelledby="review-title" className="grid content-start gap-4">
      <h2 id="review-title" ref={reviewHeading} tabIndex={-1} className="font-bold outline-none">
        Revise seu pedido
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-copy">Colecionador</dt>
        <dd>
          {form.getValues('displayName')} · @{form.getValues('username')}
        </dd>
        <dt className="text-copy">E-mail</dt>
        <dd>{form.getValues('email')}</dd>
        {form.getValues('note').trim() && (
          <>
            <dt className="text-copy">Observação</dt>
            <dd className="break-words">{form.getValues('note')}</dd>
          </>
        )}
        <dt className="text-copy">Carteira</dt>
        <dd>
          {wallet.nickname} · {shortAddress(wallet.address)}
        </dd>
        <dt className="text-copy">Rede</dt>
        <dd>{networkLabels[network]}</dd>
        <dt className="text-copy">Conectada via</dt>
        <dd>{providerLabels[provider]}</dd>
      </dl>
      <Button type="button" variant="link" className="justify-self-start px-0" disabled={busy} onClick={() => setStep('edit')}>
        Editar dados
      </Button>
    </section>
  )

  const connectionStatus = (
    <div className="grid gap-2 text-sm">
      {connected ? (
        <p role="status" className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {providerLabels[provider]} conectada · {shortAddress(wallet.address)}
          </span>
          <Button type="button" variant="link" size="xs" disabled={busy} onClick={() => connect.reset()}>
            Desconectar
          </Button>
        </p>
      ) : (
        !connect.isError && <p className="text-copy">Conecte a carteira para revisar o pedido.</p>
      )}
      {connect.isError && (
        <p role="alert" className="text-destructive">
          {errorMessage(connect.error)} Tente de novo ou escolha outra carteira.
        </p>
      )}
    </div>
  )

  const alerts = (
    <>
      {quote.data.issues.map((issue) => (
        <p key={`${issue.nftId}-${issue.editionId}`} role="alert" className="text-sm text-destructive">
          {issue.message}
        </p>
      ))}
      {quoteChanged && (
        <div role="alert" className="grid gap-3 rounded-md border border-highlight p-4 text-sm">
          <p>
            Os valores mudaram desde a sua revisão. Total anterior: {formatEth(reviewedQuote.total)}. Novo total:{' '}
            {formatEth(quote.data.total)}.
          </p>
          <Button type="button" variant="outline" disabled={quote.isFetching} onClick={() => setReviewedQuote(quote.data)}>
            Aceitar novo valor
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  )

  const primaryDisabled = busy || (connected && !canRetry && blocked)

  if (!isDesktop) {
    return (
      <form noValidate aria-label="Pagamento" onSubmit={onSubmit} className="grid gap-8">
        {reviewing ? (
          review
        ) : (
          <>
            <WalletCards wallets={wallets} value={walletId} onSelect={selectWallet} />
            <ProviderOptionsMobile field={form.register('provider')} />
            <fieldset className="grid gap-4">
              <legend className="mb-4 font-bold">Perfil do colecionador</legend>
              {collectorFields}
              {emailField}
              {networkField}
              {noteField}
            </fieldset>
          </>
        )}
        {connectionStatus}
        {alerts}
        <p className="flex justify-end gap-6 text-lg font-bold">
          Total:{' '}
          <span data-testid="summary-total" className="text-highlight">
            {formatEth(quote.data.total)}
          </span>
        </p>
        <Button type="submit" variant="pill" size="xl" disabled={primaryDisabled}>
          {primaryLabel}
        </Button>
      </form>
    )
  }

  return (
    <form
      noValidate
      aria-label="Pagamento"
      onSubmit={onSubmit}
      className="grid gap-10 lg:grid-cols-[minmax(0,763px)_405px] lg:justify-between"
    >
      {reviewing ? (
        review
      ) : (
        <fieldset className="grid content-start gap-x-6 gap-y-5 md:grid-cols-2">
          <legend className="mb-4 text-lg font-bold">Perfil do colecionador</legend>
          {collectorFields}
          {networkField}
          <TextField label="Nome do perfil" readOnly value={wallet.profileName} className="text-copy" />
          <TextField label="Endereço da carteira" readOnly value={wallet.address} className="text-copy" />
          <TextField
            label="ENS ou carteira secundária (opcional)"
            readOnly
            value={wallet.secondaryAddress ?? ''}
            placeholder="ENS ou carteira secundária (opcional)"
            className="text-copy"
          />
          <div className="grid gap-1.5">
            <Label htmlFor="checkout-wallet">
              Tipo de carteira<span aria-hidden="true" className="text-coral">*</span>
            </Label>
            <select
              id="checkout-wallet"
              value={walletId}
              onChange={(event) => selectWallet(wallets.find((candidate) => candidate.id === event.target.value)!)}
              className="h-10 rounded-sm border border-input bg-transparent px-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {wallets.map((option) => (
                <option key={option.id} value={option.id} className="bg-card">
                  {option.nickname} · {shortAddress(option.address)}
                </option>
              ))}
            </select>
          </div>
          <TextField label="Código de indicação" readOnly value={wallet.referralCode} className="text-copy" />
          {emailField}
          <TextField label="Nome ENS" readOnly value={wallet.ensName} className="text-copy" />
          <p className="text-xs text-copy md:col-span-2">
            Os dados da carteira vêm do cadastro em{' '}
            <Link to="/profile" className="text-highlight underline">
              Perfil
            </Link>
            .
          </p>
          <div className="md:col-span-2">{noteField}</div>
        </fieldset>
      )}

      <div className="grid content-start gap-5">
        <CheckoutLines quote={quote.data} items={items} />
        <p className="text-center text-sm">
          Tem um código promocional?{' '}
          <Link to="/cart" className="text-highlight hover:underline">
            Aplique aqui
          </Link>
        </p>
        <OrderSummary quote={quote.data} busy={quote.isFetching} />
        {!reviewing && <ProviderOptionsDesktop field={form.register('provider')} value={provider} />}
        {connectionStatus}
        {alerts}
        <Button type="submit" size="lg" className="h-[45px] rounded-lg" disabled={primaryDisabled}>
          {primaryLabel}
        </Button>
      </div>
    </form>
  )
}
