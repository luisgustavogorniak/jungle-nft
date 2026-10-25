import type { Ref } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { Order } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { DialogTitle } from '@/components/ui/dialog'
import { networkLabels, providerLabels, shortAddress } from '@/features/checkout/labels'
import { formatEth } from '@/lib/eth'

/** "THANK YOU" envelope of the confirmation modal (D5). */
function ThankYouIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 66 80"
      className="h-20 w-[66px] text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* One continuous outline for the envelope and rounded joins, so no stroke ends poke out. */}
      <path d="M64 34V76H2V34L33 58L64 34" />
      <path d="M2 76L25 52M64 76L41 52" />
      <path d="M8 6H28L33 2L38 6H58V42H8Z" className="fill-card" />
      <text x="33" y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" stroke="none">
        THANK
      </text>
      <text x="33" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" stroke="none">
        YOU
      </text>
    </svg>
  )
}

const titles: Record<Order['status'], string> = {
  confirmed: 'Seus NFTs agora estão na sua carteira',
  pending: 'Pagamento em processamento',
  declined: 'Pagamento recusado',
}

/**
 * Receipt of the order snapshot (D5). The same layout serves the three states:
 * only a confirmed order shows the transaction; pending and declined say what
 * happens next.
 */
export function OrderReceipt({
  order,
  titleRef,
  inDialog = false,
}: {
  order: Order
  titleRef?: Ref<HTMLHeadingElement>
  /** Inside the modal the title is the dialog title, which names the dialog. */
  inDialog?: boolean
}) {
  const Heading = inDialog ? DialogTitle : 'h1'
  // "24 Out, 2026", the format of the layout.
  const updatedAt = new Date(order.updatedAt)
  const month = updatedAt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const date = `${String(updatedAt.getDate()).padStart(2, '0')} ${month[0].toUpperCase()}${month.slice(1)}, ${updatedAt.getFullYear()}`

  return (
    <article aria-labelledby={inDialog ? undefined : 'order-title'} className="grid gap-4">
      <header className="grid justify-items-center gap-4 border-b border-primary pb-4 text-center">
        {order.status === 'confirmed' && <ThankYouIcon />}
        {order.status === 'pending' && <Loader2 aria-hidden="true" className="size-12 animate-spin text-primary" />}
        <Heading
          // In the dialog, DialogTitle keeps the id Radix links to the dialog.
          {...(inDialog ? {} : { id: 'order-title' })}
          ref={titleRef}
          tabIndex={-1}
          data-testid={order.status === 'confirmed' ? 'order-status' : undefined}
          className={`text-base leading-normal font-bold outline-none ${order.status === 'declined' ? 'text-destructive' : 'text-copy'}`}
        >
          {titles[order.status]}
        </Heading>
        {order.status === 'pending' && (
          <p role="status" data-testid="order-status" className="text-sm text-copy">
            Aguardando a confirmação da rede. Você pode recarregar a página: o pedido não será duplicado.
          </p>
        )}
        {order.status === 'declined' && (
          <p role="alert" data-testid="order-status" className="text-sm">
            {order.declineReason ?? 'O pagamento não foi concluído.'} Seus itens continuam no carrinho.
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-4 border-b border-primary pb-3 text-sm sm:grid-cols-[repeat(4,auto)] sm:justify-between sm:gap-0 sm:px-10 sm:divide-x sm:divide-primary sm:whitespace-nowrap">
        <div className="grid content-start gap-1 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <dt className="text-copy">ID da transação</dt>
          <dd data-testid="order-tx" className="text-copy">
            {order.txHash ? shortAddress(order.txHash) : order.status === 'pending' ? 'Aguardando' : '—'}
          </dd>
        </div>
        <div className="grid content-start gap-1 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <dt className="text-copy">Data</dt>
          <dd className="text-copy">{date}</dd>
        </div>
        <div className="grid content-start gap-1 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <dt className="text-copy">Total</dt>
          <dd data-testid="order-total" className="text-copy">
            {formatEth(order.total)}
          </dd>
        </div>
        <div className="grid content-start gap-1 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <dt className="text-copy">Carteira</dt>
          <dd className="text-copy" title={order.walletAddress}>
            {providerLabels[order.provider]}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="tx-details" className="grid gap-3 sm:px-10">
        <h2 id="tx-details" className="font-bold">
          Detalhes da transação
        </h2>
        <div aria-hidden="true" className="grid grid-cols-[1fr_70px_90px] border-b border-border pb-2 font-bold">
          <span>NFTs</span>
          <span className="text-center">Edições</span>
          <span className="text-right">Subtotal</span>
        </div>
        <ul aria-label="Itens comprados" className="grid gap-3">
          {order.lines.map((line) => (
            <li key={`${line.nftId}-${line.editionId}`} className="grid grid-cols-[1fr_70px_90px] items-center">
              <span className="flex min-w-0 items-center gap-3">
                <img src={line.image} alt="" width={70} height={70} className="size-[60px] shrink-0 rounded-sm object-cover sm:size-[70px]" />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{line.name}</span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-copy">
                    <span>ID do token: {line.tokenId}</span>
                    <span>Edição: {line.editionLabel}</span>
                  </span>
                </span>
              </span>
              <span className="text-center text-copy">(x {line.quantity})</span>
              <span className="text-right font-bold text-highlight">{formatEth(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 border-b border-border pt-2 pb-3 sm:pl-[170px]">
          {order.couponCode && (
            <>
              <dt>Desconto ({order.couponCode})</dt>
              <dd className="text-right">(-) {order.discount}</dd>
            </>
          )}
          <dt>Taxa de rede</dt>
          <dd className="text-right">{formatEth(order.networkFee)}</dd>
          <dt className="font-bold">Total</dt>
          <dd className="text-right font-bold text-highlight">{formatEth(order.total)}</dd>
        </dl>
      </section>

      <footer className="grid justify-items-center gap-4 pb-4 text-center text-copy">
        {order.status === 'confirmed' && (
          <>
            <p className="max-w-[460px]">
              Transação confirmada na {networkLabels[order.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
            </p>
            {/* The hash is simulated: a real explorer link would lead nowhere. */}
            <span className="group relative">
              <Button
                type="button"
                aria-disabled="true"
                aria-describedby="explorer-note"
                className="h-auto cursor-not-allowed rounded-[5px] p-4 opacity-60 hover:bg-primary"
              >
                Ver no Etherscan
              </Button>
              <span
                id="explorer-note"
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-sm bg-secondary px-2 py-1 text-xs whitespace-nowrap text-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              >
                Transação simulada
              </span>
            </span>
          </>
        )}
        {order.status === 'declined' && (
          <Button asChild variant="outline">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        )}
        {order.status === 'pending' && (
          <p className="text-sm">A confirmação aparece aqui sozinha assim que a rede responder.</p>
        )}
      </footer>
    </article>
  )
}
