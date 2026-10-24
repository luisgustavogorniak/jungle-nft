import type { Quote } from '@/api/contracts'
import { formatEth } from '@/lib/eth'

/** Totals always come from the API quote, never from client-side math. */
export function OrderSummary({ quote }: { quote: Quote }) {
  return (
    <dl aria-label="Resumo do pedido" className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
      <dt>Subtotal</dt>
      <dd data-testid="summary-subtotal">{formatEth(quote.subtotal)}</dd>
      <dt>Desconto{quote.coupon ? ` (${quote.coupon.code})` : ''}</dt>
      <dd data-testid="summary-discount">- {formatEth(quote.discount)}</dd>
      <dt>Taxa de rede</dt>
      <dd data-testid="summary-fee">{formatEth(quote.networkFee)}</dd>
      <dt className="font-bold">Total</dt>
      <dd data-testid="summary-total" className="font-bold">
        {formatEth(quote.total)}
      </dd>
    </dl>
  )
}
