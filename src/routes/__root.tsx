import { createRootRouteWithContext, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { hasTabBar } from '@/components/layout/tab-bar-visibility'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Container } from '@/components/layout/container'
import { LiveAnnouncer } from '@/components/live-announcer'
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
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      {/* md+: at least one screen tall, so the footer (which has its own top margin) starts below the
          fold and is never seen being pushed down while the page loads in stages. */}
      <div
        id="main"
        tabIndex={-1}
        className={cn('outline-none md:min-h-[calc(100svh-5rem)]', hasTabBar(pathname) && 'pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-0')}
      >
        <Outlet />
      </div>
      {/* Profile and wallets have no footer in the layout (D8/D9). */}
      {!pathname.startsWith('/profile') && <SiteFooter />}
      <MobileTabBar />
      {/* On the mobile detail the toast sits above the fixed buy bar, not over "Comprar NFT". */}
      <Toaster mobileOffset={pathname.startsWith('/nfts/') ? { bottom: 'calc(11rem + env(safe-area-inset-bottom))' } : undefined} />
      <LiveAnnouncer />
    </>
  )
}
