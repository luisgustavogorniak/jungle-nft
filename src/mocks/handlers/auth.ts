import { http, HttpResponse } from 'msw'
import { loginRequestSchema, registerRequestSchema, type Session } from '@/api/contracts'
import { db, hashPassword, saveDb } from '../db'
import {
  createSession,
  errorResponse,
  findSession,
  parseBody,
  readToken,
  requireUser,
  toPublicUser,
  withScenario,
} from '../utils'
import type { SessionRecord } from '../db'
import type { UserRecord } from '../fixtures/users'

function toSession(session: SessionRecord, user: UserRecord): Session {
  return { token: session.token, expiresAt: session.expiresAt, user: toPublicUser(user) }
}

export const authHandlers = [
  http.post(
    '/api/auth/register',
    withScenario('auth', async ({ request }) => {
      const body = await parseBody(request, registerRequestSchema)
      const users = db().users
      const fieldErrors: Record<string, string> = {}
      if (users.some((user) => user.email.toLowerCase() === body.email.toLowerCase())) {
        fieldErrors.email = 'Este e-mail já está cadastrado'
      }
      if (users.some((user) => user.username.toLowerCase() === body.username.toLowerCase())) {
        fieldErrors.username = 'Este nome de usuário já está em uso'
      }
      if (Object.keys(fieldErrors).length > 0) {
        return errorResponse('CONFLICT', 'Já existe uma conta com esses dados', { fieldErrors })
      }

      const salt = crypto.randomUUID().slice(0, 8)
      const user: UserRecord = {
        id: `user-${crypto.randomUUID()}`,
        username: body.username,
        displayName: body.username,
        email: body.email,
        avatarUrl: null,
        ensName: null,
        walletNickname: null,
        salt,
        passwordHash: await hashPassword(body.password, salt),
      }
      users.push(user)
      db().favorites[user.id] = []
      db().wallets[user.id] = []
      const session = createSession(user.id)
      saveDb()
      return HttpResponse.json(toSession(session, user), { status: 201 })
    }),
  ),

  http.post(
    '/api/auth/login',
    withScenario('auth', async ({ request }) => {
      const body = await parseBody(request, loginRequestSchema)
      const user = db().users.find((candidate) => candidate.email.toLowerCase() === body.email.toLowerCase())
      const valid = user && (await hashPassword(body.password, user.salt)) === user.passwordHash
      if (!user || !valid) return errorResponse('UNAUTHENTICATED', 'E-mail ou senha inválidos')

      const session = createSession(user.id)
      saveDb()
      return HttpResponse.json(toSession(session, user))
    }),
  ),

  http.get(
    '/api/auth/session',
    withScenario('auth', ({ request }) => {
      const user = requireUser(request)
      return HttpResponse.json(toSession(findSession(request)!, user))
    }),
  ),

  http.post(
    '/api/auth/logout',
    withScenario('auth', ({ request }) => {
      const token = readToken(request)
      db().sessions = db().sessions.filter((session) => session.token !== token)
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
