import { createRootRouteWithContext, Link, Outlet, useNavigate } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { useLogout, useSession } from '@/features/auth/session'
import { useRealtime } from '@/realtime/use-realtime'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="underline">
        Voltar para o início
      </Link>
    </main>
  ),
})

function SessionArea() {
  const { user, isPending } = useSession()
  const logout = useLogout()
  const navigate = useNavigate()

  if (isPending) return null
  if (!user) {
    return (
      <Link to="/login" search={{ redirect: undefined }}>
        Entrar
      </Link>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <span data-testid="session-user">{user.displayName}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          logout.mutate()
          void navigate({ to: '/' })
        }}
      >
        Sair
      </Button>
    </div>
  )
}

function RootLayout() {
  const { user } = useSession()
  useRealtime(user?.id ?? null)

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b p-4">
        <Link to="/" className="font-bold tracking-widest">
          KURIO
        </Link>
        <nav aria-label="Principal" className="flex gap-4">
          <Link to="/">Início</Link>
          <Link to="/cart">Carrinho</Link>
          <Link to="/profile">Meu perfil</Link>
        </nav>
        <SessionArea />
      </header>
      <Outlet />
      <Toaster />
    </>
  )
}
