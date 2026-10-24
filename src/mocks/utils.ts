import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { ApiErrorBody, ErrorCode, Nft } from '@/api/contracts'
import { GUEST_HEADER } from '@/api/http'
import { db, type SessionRecord } from './db'
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
    if (failure === 500) return errorResponse('INTERNAL_ERROR', 'Simulated server error')
    if (failure === 503) return errorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable')
    return resolver(info)
  }
}

// ---------- Auth ----------

function findSession(request: Request): SessionRecord | null {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  return db().sessions.find((session) => session.token === token) ?? null
}

/** Returns the authenticated user or throws a 401 response (MSW sends thrown responses as-is). */
export function requireUser(request: Request): UserRecord {
  const session = findSession(request)
  if (!session) throw errorResponse('UNAUTHENTICATED', 'Authentication required')
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    throw errorResponse('SESSION_EXPIRED', 'Your session has expired')
  }
  const user = db().users.find((candidate) => candidate.id === session.userId)
  if (!user) throw errorResponse('UNAUTHENTICATED', 'Authentication required')
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
  return { ...nft, image: resolveNftImage(imageFile) }
}

export function toPublicUser(user: UserRecord) {
  const { passwordHash: _hash, salt: _salt, ...publicUser } = user
  return publicUser
}
