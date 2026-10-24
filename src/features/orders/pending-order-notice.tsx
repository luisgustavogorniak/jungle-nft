import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/session'
import { pendingOrdersQueryOptions } from './queries'

/**
 * A pending order keeps its items in the cart until the network confirms it.
 * This notice explains that and links to the order, so the user does not buy twice.
 */
export function PendingOrderNotice() {
  const { isAuthenticated } = useSession()
  const pending = useQuery({ ...pendingOrdersQueryOptions, enabled: isAuthenticated })
  const order = pending.data?.[0]
  if (!order) return null

  return (
    <p role="status" className="rounded-[3px] border border-primary bg-card px-4 py-3 text-sm">
      Você tem um pedido aguardando a confirmação da rede. Os itens dele saem do carrinho quando ele for confirmado.{' '}
      <Link to="/orders/$orderId" params={{ orderId: order.id }} className="font-bold text-highlight underline">
        Ver pedido
      </Link>
    </p>
  )
}
