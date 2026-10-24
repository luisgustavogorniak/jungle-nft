import { http, HttpResponse } from 'msw'
import { realtimeHandlers } from '../realtime'
import { getScenarioName } from '../scenarios'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok', scenario: getScenarioName() })),
  ...authHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  ...realtimeHandlers,
]
