import { http, HttpResponse } from 'msw'
import {
  walletConnectionRequestSchema,
  walletInputSchema,
  type Wallet,
  type WalletConnection,
  type WalletSlot,
} from '@/api/contracts'
import { db, saveDb } from '../db'
import { getScenario } from '../scenarios'
import { errorResponse, parseBody, requireUser, withScenario } from '../utils'

export const walletHandlers = [
  http.get(
    '/api/wallets',
    withScenario('wallets', ({ request }) => HttpResponse.json(db().wallets[requireUser(request).id] ?? [])),
  ),

  /** Creates or replaces the wallet of a slot. An address can belong to only one account. */
  http.put(
    '/api/wallets/:slot',
    withScenario('wallets', async ({ request, params }) => {
      const user = requireUser(request)
      if (params.slot !== 'primary' && params.slot !== 'secondary') {
        return errorResponse('NOT_FOUND', 'Carteira não encontrada')
      }
      const slot: WalletSlot = params.slot
      const body = await parseBody(request, walletInputSchema)

      const takenByOther = Object.entries(db().wallets).some(
        ([ownerId, wallets]) =>
          ownerId !== user.id && wallets.some((other) => other.address.toLowerCase() === body.address.toLowerCase()),
      )
      if (takenByOther) {
        return errorResponse('CONFLICT', 'Este endereço já está cadastrado em outra conta', {
          fieldErrors: { address: 'Este endereço já está cadastrado em outra conta' },
        })
      }

      const owned = (db().wallets[user.id] ??= [])
      const existing = owned.find((candidate) => candidate.slot === slot)
      const wallet: Wallet = {
        ...body,
        id: existing?.id ?? `wallet-${crypto.randomUUID()}`,
        slot,
        updatedAt: new Date().toISOString(),
      }
      if (existing) owned[owned.indexOf(existing)] = wallet
      else owned.push(wallet)
      // The profile shows the nickname of the primary wallet as "Apelido da carteira".
      if (slot === 'primary') user.walletNickname = wallet.nickname
      saveDb()
      return HttpResponse.json(wallet)
    }),
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
        return errorResponse('WALLET_REJECTED', 'A conexão foi recusada na carteira.')
      }
      return HttpResponse.json({ ...body, walletId: wallet.id, connectedAt: new Date().toISOString() } satisfies WalletConnection)
    }),
  ),
]
