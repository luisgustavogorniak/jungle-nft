import { http, HttpResponse } from 'msw'
import { realtimeHandlers } from '../realtime'
import { getScenarioName } from '../scenarios'
import { authHandlers } from './auth'
import { profileHandlers } from './profile'

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok', scenario: getScenarioName() })),
  ...authHandlers,
  ...profileHandlers,
  ...realtimeHandlers,
]
