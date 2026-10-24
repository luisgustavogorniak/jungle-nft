import { http, HttpResponse } from 'msw'
import { realtimeHandlers } from './realtime'

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),
  ...realtimeHandlers,
]
