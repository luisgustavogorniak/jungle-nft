import { http, HttpResponse } from 'msw'
import { db, saveDb } from '../db'
import { findNft } from '../commerce'
import { errorResponse, requireUser, withScenario } from '../utils'

const list = (userId: string) => (db().favorites[userId] ??= [])

export const favoriteHandlers = [
  http.get(
    '/api/favorites',
    withScenario('favorites.read', ({ request }) => HttpResponse.json({ nftIds: list(requireUser(request).id) })),
  ),

  // PUT and DELETE are idempotent: repeating them leaves the same state.
  http.put(
    '/api/favorites/:nftId',
    withScenario('favorites.write', ({ request, params }) => {
      const user = requireUser(request)
      const nftId = String(params.nftId)
      if (!findNft(nftId)) return errorResponse('NOT_FOUND', 'NFT não encontrado')
      const ids = list(user.id)
      if (!ids.includes(nftId)) ids.push(nftId)
      saveDb()
      return HttpResponse.json({ nftIds: ids })
    }),
  ),

  http.delete(
    '/api/favorites/:nftId',
    withScenario('favorites.write', ({ request, params }) => {
      const user = requireUser(request)
      db().favorites[user.id] = list(user.id).filter((id) => id !== String(params.nftId))
      saveDb()
      return HttpResponse.json({ nftIds: db().favorites[user.id] })
    }),
  ),
]
