import { http, HttpResponse } from 'msw'
import { walletConnectionRequestSchema, type WalletConnection } from '@/api/contracts'
import { db } from '../db'
import { getScenario } from '../scenarios'
import { errorResponse, parseBody, requireUser, withScenario } from '../utils'

export const walletHandlers = [
  http.get(
    '/api/wallets',
    withScenario('wallets', ({ request }) => HttpResponse.json(db().wallets[requireUser(request).id] ?? [])),
  ),

  /** Simulates the provider prompt: the user approves (default) or refuses (`wallet-rejected`). */
  http.post(
    '/api/wallets/:walletId/connect',
    withScenario('wallets', async ({ request, params }) => {
      const user = requireUser(request)
      const wallet = db().wallets[user.id]?.find((candidate) => candidate.id === params.walletId)
      if (!wallet) return errorResponse('NOT_FOUND', 'Carteira não encontrada')
      const body = await parseBody(request, walletConnectionRequestSchema)
      if (getScenario().walletRejects) {
        return errorResponse('WALLET_REJECTED', 'A conexão foi recusada na carteira')
      }
      return HttpResponse.json({ ...body, walletId: wallet.id, connectedAt: new Date().toISOString() } satisfies WalletConnection)
    }),
  ),
]
