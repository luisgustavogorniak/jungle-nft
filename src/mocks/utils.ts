import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { ApiErrorBody, ErrorCode, Nft } from '@/api/contracts'
import { GUEST_HEADER } from '@/api/http'
import type { z } from 'zod'
import { db, saveDb, type SessionRecord } from './db'
import type { NftRecord } from './fixtures/nfts'
import type { UserRecord } from './fixtures/users'
import { resolveNftImage } from './images'
import { getScenario, latencyFor, type RouteKey } from './scenarios'

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  AVAILABILITY_CONFLICT: 409,
  QUOTE_CHANGED: 409,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  IDEMPOTENCY_CONFLICT: 409,
  WALLET_REJECTED: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  extra: { fieldErrors?: Record<string, string>; details?: unknown } = {},
) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, ...extra } }, { status: statusByCode[code] })
}

/**
 * Wraps a resolver with the active scenario: latency first, then the configured
 * failure for this route (if any), then the real resolver.
 */
export function withScenario<
  Params extends PathParams,
  RequestBody extends DefaultBodyType,
  ResponseBody extends DefaultBodyType,
>(
  route: RouteKey,
  resolver: HttpResponseResolver<Params, RequestBody, ResponseBody>,
): HttpResponseResolver<Params, RequestBody, ResponseBody | ApiErrorBody> {
  return async (info) => {
    await delay(latencyFor(route))
    const failure = getScenario().failures?.[route]
    if (failure === 'network') return HttpResponse.error()
    if (failure === 'timeout') await delay('infinite')
    if (failure === 500) return errorResponse('INTERNAL_ERROR', 'Erro inesperado no servidor')
    if (failure === 503) return errorResponse('SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível')
    return resolver(info)
  }
}

/** Parses a JSON body against a contract schema, or throws a 422 with field errors. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await request.json().catch(() => null)
  const result = schema.safeParse(body)
  if (result.success) return result.data
  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'body'
    fieldErrors[field] ??= issue.message
  }
  throw errorResponse('VALIDATION_ERROR', 'Verifique os campos destacados', { fieldErrors })
}

// ---------- Sessions ----------

export const SESSION_TTL_MS = 30 * 60 * 1000

export function createSession(userId: string): SessionRecord {
  const session = {
    token: crypto.randomUUID(),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  db().sessions.push(session)
  return session
}

/** Forces every session to expire now (mock control used by tests and demos). */
export function expireAllSessions() {
  const past = new Date(Date.now() - 1000).toISOString()
  for (const session of db().sessions) session.expiresAt = past
  saveDb()
}

export function readToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

// ---------- Auth ----------

export function findSession(request: Request): SessionRecord | null {
  const token = readToken(request)
  if (!token) return null
  return db().sessions.find((session) => session.token === token) ?? null
}

/** Returns the authenticated user or throws a 401 response (MSW sends thrown responses as-is). */
export function requireUser(request: Request): UserRecord {
  const session = findSession(request)
  if (!session) throw errorResponse('UNAUTHENTICATED', 'Faça login para continuar')
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    throw errorResponse('SESSION_EXPIRED', 'Sua sessão expirou')
  }
  const user = db().users.find((candidate) => candidate.id === session.userId)
  if (!user) throw errorResponse('UNAUTHENTICATED', 'Faça login para continuar')
  return user
}

/** Authenticated user when the token is valid, otherwise null (guest). */
export function optionalUser(request: Request): UserRecord | null {
  try {
    return requireUser(request)
  } catch {
    return null
  }
}

/** Cart owner: the user when authenticated, the guest id otherwise. */
export function ownerKey(request: Request): string {
  const user = optionalUser(request)
  if (user) return `user:${user.id}`
  const guestId = request.headers.get(GUEST_HEADER)
  if (!guestId) throw errorResponse('VALIDATION_ERROR', `Missing ${GUEST_HEADER} header`)
  return `guest:${guestId}`
}

// ---------- Serializers ----------

export function toNft(record: NftRecord): Nft {
  const { imageFile, ...nft } = record
  return { ...nft, image: resolveNftImage(imageFile), thumbnail: resolveNftImage(imageFile, 'thumb') }
}

export function toPublicUser(user: UserRecord) {
  const { passwordHash: _hash, salt: _salt, ...publicUser } = user
  return publicUser
}
