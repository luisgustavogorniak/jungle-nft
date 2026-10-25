import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/form-errors'
import { pendingOrdersQueryOptions, useCreateOrder, type Attempt } from './queries'

/**
 * Shown instead of the checkout form while an attempt has no definitive answer.
 * The retry sends the same request with the same key: the API returns the
 * order it already created, pending or confirmed, so nothing is bought twice.
 * It does not depend on the cart, which empties when the order is confirmed.
 */
export function UnresolvedOrder({ attempt }: { attempt: Attempt }) {
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const pending = useQuery(pendingOrdersQueryOptions)
  const order = pending.data?.[0]

  // Any answer but a transient error ends the attempt, and this panel unmounts at once.
  // `mutate` callbacks are dropped for an unmounted component; the promise of
  // `mutateAsync` still settles, so navigation and the error toast happen anyway.
  const retry = () =>
    void createOrder.mutateAsync(attempt).then(
      (created) => navigate({ to: '/orders/$orderId', params: { orderId: created.id } }),
      (error: Error) => toast.error(errorMessage(error)),
    )

  return (
    <section aria-labelledby="unresolved-title" className="grid justify-items-start gap-3 rounded-[3px] border border-primary bg-card p-6">
      <h2 id="unresolved-title" className="font-bold">
        Pedido em andamento
      </h2>
      <p className="text-sm text-copy">
        A resposta do seu pedido não chegou, mas ele pode já ter sido criado. Tente novamente: a mesma tentativa é reenviada e
        nada é cobrado duas vezes.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" disabled={createOrder.isPending} onClick={retry}>
          {createOrder.isPending ? 'Consultando pedido…' : 'Tentar novamente'}
        </Button>
        {order && (
          <Link to="/orders/$orderId" params={{ orderId: order.id }} className="text-sm font-bold text-highlight underline">
            Ver pedido
          </Link>
        )}
      </div>
    </section>
  )
}
