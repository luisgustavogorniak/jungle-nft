import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { toast } from 'sonner'
import { onSessionExpired } from '@/api/http'
import { endSession } from '@/features/auth/session'
import { createQueryClient } from '@/lib/query-client'
import { parseSearch, stringifySearch } from '@/lib/search-params'
import { routeTree } from './routeTree.gen'

const queryClient = createQueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  parseSearch,
  stringifySearch,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/**
 * A private request rejected with 401 ends the local session and sends the user
 * to login, keeping the current URL so they resume where they were.
 */
function useSessionExpiryRedirect() {
  useEffect(
    () =>
      onSessionExpired(() => {
        const { pathname, href } = router.state.location
        endSession(queryClient)
        if (pathname === '/login') return
        toast.error('Sua sessão expirou. Entre novamente.', { id: 'session-expired' })
        void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
      }),
    [],
  )
}

export function App() {
  useSessionExpiryRedirect()
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
