import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { useSession } from '@/features/auth/session'
import { useRealtime } from '@/realtime/use-realtime'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main>
      <Container className="grid justify-items-start gap-4 py-24">
        <h1 className="text-[28px] font-bold">Página não encontrada</h1>
        <p className="text-copy">O endereço que você acessou não existe ou foi movido.</p>
        <Button asChild>
          <Link to="/">Voltar para o início</Link>
        </Button>
      </Container>
    </main>
  )
}

function RootLayout() {
  const { user } = useSession()
  useRealtime(user?.id ?? null)

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <div id="main" tabIndex={-1} className="pb-28 outline-none md:pb-0">
        <Outlet />
      </div>
      <SiteFooter />
      <MobileTabBar />
      <Toaster />
    </>
  )
}
