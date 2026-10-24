import { http, HttpResponse } from 'msw'
import { cartItemInputSchema, quoteRequestSchema } from '@/api/contracts'
import { assertAvailable, createQuote, getCartRecord, setCartItems, toCart } from '../commerce'
import { OPEN_EDITION_LIMIT } from '../fixtures/nfts'
import { saveDb } from '../db'
import { ownerKey, parseBody, withScenario } from '../utils'

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
