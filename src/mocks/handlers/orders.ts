import { delay, http, HttpResponse } from 'msw'
import { createOrderRequestSchema } from '@/api/contracts'
import { IDEMPOTENCY_HEADER } from '@/api/http'
import { assertAvailable, findEdition, findNft, quoteStillValid } from '../commerce'
import { db, saveDb, type OrderRecord } from '../db'
import { publishNftUpdate } from '../nft-updates'
import { scheduleSettlement, settleIfDue, toOrder } from '../orders'
import { DEFAULT_SETTLEMENT, getScenario } from '../scenarios'
import { errorResponse, parseBody, requireUser, withScenario } from '../utils'

/** Key order independent serialization, used to compare idempotent requests. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export const orderHandlers = [
  /**
   * Idempotent creation: the same Idempotency-Key with the same body returns
   * the original order; the same key with a different body is a conflict.
   */
  http.post(
    '/api/orders',
    withScenario('orders.create', async ({ request }) => {
      const user = requireUser(request)
      const key = request.headers.get(IDEMPOTENCY_HEADER)
      if (!key) return errorResponse('VALIDATION_ERROR', `Cabeçalho ${IDEMPOTENCY_HEADER} obrigatório`)
      const body = await parseBody(request, createOrderRequestSchema)
      const requestHash = stableStringify(body)

      const previous = Object.values(db().orders).find(
        (order) => order.userId === user.id && order.idempotencyKey === key,
      )
      if (previous) {
        if (previous.requestHash !== requestHash) {
          return errorResponse('IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados')
        }
        settleIfDue(previous)
        return HttpResponse.json(toOrder(previous))
      }

      const quote = db().quotes[body.quoteId]
      if (!quote || quote.ownerKey !== `user:${user.id}` || !quoteStillValid(quote)) {
        return errorResponse('QUOTE_CHANGED', 'Preço, disponibilidade ou taxas mudaram. Revise o pedido.')
      }
      if (quote.lines.length === 0) return errorResponse('VALIDATION_ERROR', 'Seu carrinho está vazio')
      const wallet = db().wallets[user.id]?.find((candidate) => candidate.id === body.walletId)
      if (!wallet) {
        return errorResponse('VALIDATION_ERROR', 'Selecione uma carteira cadastrada', {
          fieldErrors: { walletId: 'Selecione uma carteira cadastrada' },
        })
      }
      for (const line of quote.lines) assertAvailable(line)

      // Reserve the units while the payment is pending.
      const lines = quote.lines.map((line) => {
        const nft = findNft(line.nftId)!
        const edition = findEdition(nft, line.editionId)!
        edition.available -= line.quantity
        return { ...line, name: nft.name, tokenId: nft.tokenId, image: nft.imageFile, editionLabel: edition.label }
      })

      const settlement = getScenario().settlement ?? DEFAULT_SETTLEMENT
      const now = new Date()
      const order: OrderRecord = {
        id: `order-${crypto.randomUUID()}`,
        status: 'pending',
        version: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        network: body.network,
        provider: body.provider,
        walletAddress: wallet.address,
        lines,
        subtotal: quote.subtotal,
        discount: quote.discount,
        networkFee: quote.networkFee,
        total: quote.total,
        couponCode: quote.coupon?.code ?? null,
        txHash: null,
        explorerUrl: null,
        declineReason: null,
        userId: user.id,
        idempotencyKey: key,
        requestHash,
        settleAt: new Date(now.getTime() + settlement.delayMs).toISOString(),
        outcome: settlement.outcome,
      }
      db().orders[order.id] = order
      saveDb()
      for (const line of lines) publishNftUpdate(line.nftId)
      scheduleSettlement(order)
      // The order exists, but the client never hears about it: only a retry
      // with the same Idempotency-Key can recover it.
      if (getScenario().orderTimeout) await delay('infinite')
      return HttpResponse.json(toOrder(order), { status: 201 })
    }),
  ),

  /** Orders of the current user, optionally filtered by status (`?status=pending`). */
  http.get(
    '/api/orders',
    withScenario('orders.read', ({ request }) => {
      const user = requireUser(request)
      const status = new URL(request.url).searchParams.get('status')
      const own = Object.values(db().orders).filter((order) => order.userId === user.id)
      for (const order of own) settleIfDue(order)
      const orders = own
        .filter((order) => !status || order.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return HttpResponse.json(orders.map(toOrder))
    }),
  ),

  http.get(
    '/api/orders/:orderId',
    withScenario('orders.read', ({ request, params }) => {
      const user = requireUser(request)
      const order = db().orders[String(params.orderId)]
      // Another user's order answers 404 too, so ids cannot be probed.
      if (!order || order.userId !== user.id) return errorResponse('NOT_FOUND', 'Pedido não encontrado')
      settleIfDue(order)
      return HttpResponse.json(toOrder(order))
    }),
  ),
]
