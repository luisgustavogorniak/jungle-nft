import axios, { AxiosError } from 'axios'
import { apiErrorBodySchema, type ErrorCode } from './contracts'
import { getGuestId, getToken } from './credentials'

export const GUEST_HEADER = 'X-Guest-Id'
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED'

/** Every failed request reaches the app as an ApiError, whatever its origin. */
export class ApiError extends Error {
  readonly status: number | null
  readonly code: ClientErrorCode
  readonly fieldErrors: Record<string, string>
  readonly details: unknown

  constructor(params: {
    status: number | null
    code: ClientErrorCode
    message: string
    fieldErrors?: Record<string, string>
    details?: unknown
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.fieldErrors = params.fieldErrors ?? {}
    this.details = params.details
  }

  /** Failures worth retrying automatically: connection, timeout and 5xx. */
  get isTransient(): boolean {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.code === 'TIMEOUT' ||
      (this.status !== null && this.status >= 500)
    )
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function toApiError(error: unknown): ApiError {
  if (axios.isCancel(error)) {
    return new ApiError({ status: null, code: 'CANCELED', message: 'Requisição cancelada' })
  }
  if (!(error instanceof AxiosError)) {
    return new ApiError({ status: null, code: 'INTERNAL_ERROR', message: 'Algo deu errado. Tente novamente.' })
  }
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new ApiError({ status: null, code: 'TIMEOUT', message: 'O servidor demorou para responder. Tente novamente.' })
  }
  if (!error.response) {
    return new ApiError({ status: null, code: 'NETWORK_ERROR', message: 'Sem conexão. Verifique sua internet e tente novamente.' })
  }
  const parsed = apiErrorBodySchema.safeParse(error.response.data)
  if (parsed.success) {
    return new ApiError({ status: error.response.status, ...parsed.data.error })
  }
  return new ApiError({
    status: error.response.status,
    code: error.response.status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
    // Axios messages are in English ("Request failed with status code 500"): the UI shows these instead.
    message: error.response.status >= 500 ? 'Algo deu errado do nosso lado. Tente novamente.' : 'Não foi possível concluir a requisição.',
  })
}

// ---------- Session expiration ----------

type SessionExpiredListener = () => void
const sessionExpiredListeners = new Set<SessionExpiredListener>()

/** Notified when an authenticated request is rejected with 401. */
export function onSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

// ---------- Client ----------

export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers[GUEST_HEADER] = getGuestId()
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    const config = error instanceof AxiosError ? error.config : undefined
    // A 401 on a private resource means the session is gone. Auth endpoints are
    // excluded: wrong credentials and the boot-time session check handle 401 themselves.
    const isAuthEndpoint = config?.url?.startsWith('/auth/') ?? false
    if (apiError.status === 401 && config?.headers?.Authorization && !isAuthEndpoint) {
      sessionExpiredListeners.forEach((listener) => listener())
    }
    return Promise.reject(apiError)
  },
)
