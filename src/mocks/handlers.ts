import { http, HttpResponse } from 'msw'
import { realtimeHandlers } from './realtime'
import { getScenarioName } from './scenarios'

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok', scenario: getScenarioName() })),
  ...realtimeHandlers,
]
