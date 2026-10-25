import { useRef } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { isApiError } from '@/api/http'
import { Container } from '@/components/layout/container'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { OrderReceipt } from '@/features/orders/order-receipt'
import { orderQueryOptions } from '@/features/orders/queries'
import { errorMessage } from '@/lib/form-errors'
import { useIsDesktop } from '@/lib/use-media-query'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderPage,
})

/**
 * The state always comes from GET /api/orders/:id (also after a reload);
 * `order.updated` events then update the same cache entry. The receipt is
 * rendered only for an order the simulation actually confirmed.
 *
 * Desktop shows it as the modal of the layout (D5), opened by the URL itself,
 * so direct access and refresh work; mobile has no frame and gets a page.
 */
function OrderPage() {
  const { orderId } = Route.useParams()
  const order = useQuery(orderQueryOptions(orderId))
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const title = useRef<HTMLHeadingElement>(null)

  if (order.isPending) {
    return (
      <main className="p-8" role="status">
        Carregando pedido…
      </main>
    )
  }
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

  if (!isDesktop) {
    return (
      <main>
        <Container className="py-6">
          <OrderReceipt order={order.data} />
        </Container>
      </main>
    )
  }

  return (
    <main className="min-h-[60vh]">
      <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
        <DialogContent
          // Radix hides the rest of the page from assistive tech but does not set aria-modal.
          aria-modal="true"
          className="top-16 max-h-[calc(100%-5rem)] translate-y-0 rounded-none p-0 pt-6 pb-[10px] sm:max-w-[578px]"
          // Focus goes to the title, so screen readers start from the result.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            title.current?.focus()
          }}
        >
          <DialogDescription className="sr-only">Resultado e recibo do pedido</DialogDescription>
          <OrderReceipt order={order.data} titleRef={title} inDialog />
        </DialogContent>
      </Dialog>
    </main>
  )
}
