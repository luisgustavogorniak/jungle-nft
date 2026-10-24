import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import type { Session } from '@/api/contracts'
import { getToken, setToken } from '@/api/credentials'
import { isApiError } from '@/api/http'
import { setCoupon } from '@/features/cart/coupon'
import { socket } from '@/realtime/socket'

export const sessionQueryKey = ['session'] as const

/** `null` = visitor. A stored token that the API rejects is discarded, not an error. */
export const sessionQueryOptions = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: async (): Promise<Session | null> => {
    if (!getToken()) return null
    try {
      return await authApi.session()
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setToken(null)
        return null
      }
      throw error
    }
  },
  staleTime: 5 * 60_000,
})

/**
 * Drops every cached query except the session itself. `queryClient.clear()` is
 * not used on purpose: it also removes the session query object, leaving mounted
 * observers (the header) subscribed to a query that no longer receives updates.
 */
function dropCachedData(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionQueryKey[0] })
}

/**
 * Starts a session after login/register. Cached data is dropped first, so
 * nothing cached for a previous user or visitor can be shown to the new one.
 */
export function startSession(queryClient: QueryClient, session: Session) {
  setToken(session.token)
  dropCachedData(queryClient)
  queryClient.setQueryData(sessionQueryKey, session)
}

/** Ends the session (logout or expiration): token, private cache and socket are dropped. */
export function endSession(queryClient: QueryClient) {
  setToken(null)
  socket.disconnect()
  setCoupon(null)
  dropCachedData(queryClient)
  queryClient.setQueryData(sessionQueryKey, null)
}

export function useSession() {
  const query = useQuery(sessionQueryOptions)
  return { ...query, user: query.data?.user ?? null, isAuthenticated: Boolean(query.data) }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    // The local session ends immediately, so leaving the page or going offline
    // right after clicking "Sair" can never keep the user logged in. Revoking
    // the token on the server is best effort.
    mutationFn: () => {
      const token = getToken()
      endSession(queryClient)
      return authApi.logout(token)
    },
  })
}

/** Only same-origin paths are accepted as post-login destination (prevents open redirects). */
export function safeRedirect(value: string | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
