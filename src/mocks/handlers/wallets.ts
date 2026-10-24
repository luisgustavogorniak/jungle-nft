import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { requireUser, withScenario } from '../utils'

export const walletHandlers = [
  http.get(
    '/api/wallets',
    withScenario('wallets', ({ request }) => HttpResponse.json(db().wallets[requireUser(request).id] ?? [])),
  ),
]
