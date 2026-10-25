import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingBag } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { useCartCount } from '@/features/cart/queries'
import { useLogout, useSession } from '@/features/auth/session'
import { Container } from './container'
import { OutOfScopeLink } from './out-of-scope'

export const SEARCH_INPUT_ID = 'catalog-search'

// The underline of the active item sits on the divider line, 10px below the row (as in the frame).
const navLink =
  "relative flex h-[35px] items-center text-base text-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-2.5 after:h-0.5 after:bg-primary after:opacity-0 hover:text-highlight"
const navActive = 'font-bold text-highlight after:opacity-100'

/** Desktop and tablet header. Mobile navigation is the tab bar. */
export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const { user, isPending } = useSession()
  const logout = useLogout()
  const cartCount = useCartCount()

  // The three market screens (detail, cart, checkout) have no divider in the layout.
  const inMarket = /^\/(nfts|cart|checkout|orders)/.test(pathname)
  const onHome = pathname === '/'

  const focusSearch = async () => {
    await navigate({ to: '/', hash: 'catalogo' })
    requestAnimationFrame(() => document.getElementById(SEARCH_INPUT_ID)?.focus())
  }

  return (
    <header className="hidden md:block">
      <Container className="pt-6">
        {/* Divider inside the 1200px column, 9px under the row of 35px. */}
        <div className={cn('grid grid-cols-[1fr_auto_1fr] items-center pb-[9px]', !inMarket && 'border-b border-primary/40')}>
        <Link to="/" className="justify-self-start text-sm font-bold tracking-[0.1em]">
          KURIO
        </Link>

        <nav aria-label="Principal">
          <ul className="flex items-center gap-10">
            <li>
              <Link to="/" aria-current={onHome ? 'page' : undefined} className={cn(navLink, onHome && navActive)}>
                Início
              </Link>
            </li>
            <li>
              <Link
                to="/"
                hash="catalogo"
                aria-current={inMarket ? 'page' : undefined}
                className={cn(navLink, inMarket && navActive)}
              >
                Mercado
              </Link>
            </li>
            <li>
              <OutOfScopeLink className={navLink}>Criadores</OutOfScopeLink>
            </li>
            <li>
              <OutOfScopeLink className={navLink}>Aprenda</OutOfScopeLink>
            </li>
          </ul>
        </nav>

        {/* h-10 = the tallest state (the "Entrar" button), so the header does not grow when the session resolves. */}
        <div className="flex h-[35px] items-center gap-4 justify-self-end">
          <Button variant="ghost" size="icon-sm" aria-label="Buscar NFTs" onClick={() => void focusSearch()}>
            <Search className="size-[22px]" />
          </Button>
          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})` : 'Carrinho'}
            className="relative inline-flex size-8 items-center justify-center rounded-md hover:bg-secondary"
          >
            <ShoppingBag className="size-[22px]" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {cartCount}
              </span>
            )}
          </Link>

          {isPending && <span aria-hidden="true" className="w-[100px]" />}
          {!isPending &&
            (user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" data-testid="session-user" className="max-w-40 truncate text-base hover:text-highlight">
                  {user.displayName}
                </Link>
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
            ) : (
              <Button asChild className="h-[35px] w-[100px] gap-2 font-medium">
                <Link to="/login" search={{ redirect: undefined, reason: undefined }}>
                  <LogIn className="size-4" />
                  Entrar
                </Link>
              </Button>
            ))}
        </div>
        </div>
      </Container>
    </header>
  )
}
