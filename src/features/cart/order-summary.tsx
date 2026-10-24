import type { Quote } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'

/** Totals always come from the API quote, never from client-side math. */
export function OrderSummary({ quote, busy = false }: { quote: Quote; busy?: boolean }) {
  return (
    <dl
      aria-label="Resumo do pedido"
      aria-busy={busy}
      className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-[15px] transition-opacity md:text-base ${busy ? 'opacity-60' : ''}`}
    >
      <dt>Subtotal</dt>
      <dd data-testid="summary-subtotal" className="text-right">
        {formatEth(quote.subtotal)}
      </dd>
      <dt>Desconto do lançamento{quote.coupon ? ` (${quote.coupon.code})` : ''}</dt>
      <dd data-testid="summary-discount" className="text-right">
        (-) {quote.discount}
      </dd>
      <dt>Taxa de rede</dt>
      <dd data-testid="summary-fee" className="text-right">
        {formatEth(quote.networkFee)}
      </dd>
      <dd className="col-span-2 -mt-2 text-right text-xs text-highlight">Taxa estimada</dd>
      <dt className="mt-2 font-bold">Total</dt>
      <dd data-testid="summary-total" className="mt-2 text-right font-bold text-highlight">
        {formatEth(quote.total)}
      </dd>
    </dl>
  )
}

/** Same rows as the summary, so loading does not shift the layout. */
export function OrderSummarySkeleton() {
  return (
    <div role="status" aria-label="Calculando valores" className="grid gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  )
}
