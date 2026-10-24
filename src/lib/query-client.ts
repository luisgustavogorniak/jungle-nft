import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/http'

const MAX_RETRIES = 2

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Only transient failures (connection, timeout, 5xx) are retried:
        // repeating a 401/404/422 would fail the same way.
        retry: (failureCount, error) => isApiError(error) && error.isTransient && failureCount < MAX_RETRIES,
      },
      mutations: {
        // Mutations are never retried automatically, so side effects are not duplicated.
        retry: false,
      },
    },
  })
}
