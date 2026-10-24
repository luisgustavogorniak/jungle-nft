import { http, HttpResponse } from 'msw'
import { requireUser, toPublicUser, withScenario } from '../utils'

export const profileHandlers = [
  http.get(
    '/api/profile',
    withScenario('profile', ({ request }) => HttpResponse.json(toPublicUser(requireUser(request)))),
  ),
]
