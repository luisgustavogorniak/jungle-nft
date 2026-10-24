import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { cartItemInputSchema, cartItemQuantitySchema, editionIdSchema, quoteRequestSchema } from '@/api/contracts'
import { assertAvailable, createQuote, getCartRecord, setCartItems, toCart } from '../commerce'
import { OPEN_EDITION_LIMIT } from '../fixtures/nfts'
import { saveDb } from '../db'
import { errorResponse, ownerKey, parseBody, withScenario } from '../utils'

function parseRef(params: Record<string, string | readonly string[] | undefined>) {
  const editionId = editionIdSchema.safeParse(params.editionId)
  if (!editionId.success) throw errorResponse('NOT_FOUND', 'Edição não encontrada')
  return { nftId: z.string().parse(params.nftId), editionId: editionId.data }
}

export const cartHandlers = [
  http.get(
    '/api/cart',
    withScenario('cart.read', ({ request }) => HttpResponse.json(toCart(ownerKey(request)))),
  ),

  /** Adds units of an edition; the resulting quantity must fit the availability. */
  http.post(
    '/api/cart/items',
    withScenario('cart.write', async ({ request }) => {
      const owner = ownerKey(request)
      const input = await parseBody(request, cartItemInputSchema)
      const items = [...getCartRecord(owner).items]
      const existing = items.find((item) => item.nftId === input.nftId && item.editionId === input.editionId)
      const quantity = Math.min((existing?.quantity ?? 0) + input.quantity, OPEN_EDITION_LIMIT)
      assertAvailable({ ...input, quantity })

      if (existing) existing.quantity = quantity
      else items.push({ ...input, quantity })
      setCartItems(owner, items)
      saveDb()
      return HttpResponse.json(toCart(owner))
    }),
  ),

  /** Sets the quantity of one line (absolute value, not a delta). */
  http.patch(
    '/api/cart/items/:nftId/:editionId',
    withScenario('cart.write', async ({ request, params }) => {
      const owner = ownerKey(request)
      const ref = parseRef(params)
      const { quantity } = await parseBody(request, cartItemQuantitySchema)
      const items = [...getCartRecord(owner).items]
      const line = items.find((item) => item.nftId === ref.nftId && item.editionId === ref.editionId)
      if (!line) return errorResponse('NOT_FOUND', 'Item não está no carrinho')
      assertAvailable({ ...ref, quantity })
      line.quantity = quantity
      setCartItems(owner, items)
      saveDb()
      return HttpResponse.json(toCart(owner))
    }),
  ),

  // Idempotent: removing a line that is already gone answers with the current cart.
  http.delete(
    '/api/cart/items/:nftId/:editionId',
    withScenario('cart.write', ({ request, params }) => {
      const owner = ownerKey(request)
      const ref = parseRef(params)
      setCartItems(
        owner,
        getCartRecord(owner).items.filter((item) => !(item.nftId === ref.nftId && item.editionId === ref.editionId)),
      )
      saveDb()
      return HttpResponse.json(toCart(owner))
    }),
  ),

  http.post(
    '/api/quote',
    withScenario('quote', async ({ request }) => {
      const owner = ownerKey(request)
      const { couponCode } = await parseBody(request, quoteRequestSchema)
      const quote = createQuote(owner, couponCode)
      saveDb()
      return HttpResponse.json(quote)
    }),
  ),
]
