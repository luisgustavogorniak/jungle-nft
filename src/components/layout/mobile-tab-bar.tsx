import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanSearch, ShoppingBag, User } from 'lucide-react'
import { SEARCH_INPUT_ID } from './site-header'
import { hasTabBar } from './tab-bar-visibility'
import { useCartCount } from '@/features/cart/queries'
import { useSession } from '@/features/auth/session'

const item =
  'relative mx-auto flex size-12 items-center justify-center rounded-full text-copy outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&.active]:text-highlight'

/**
 * Mobile navigation (below 768px), replacing the desktop header as in the layout.
 * The central FAB of the layout has no defined action in the frame: here it is "Explorar", which
 * takes to the home and focuses the search.
 */
export function MobileTabBar() {
  const { user } = useSession()
  const cartCount = useCartCount()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()

  if (!hasTabBar(pathname)) return null

  const explore = async () => {
    await navigate({ to: '/', search: (previous) => previous })
    requestAnimationFrame(() => {
      const input = document.getElementById(SEARCH_INPUT_ID)
      input?.focus()
      input?.scrollIntoView({ block: 'center' })
    })
  }

  return (
    <nav
      aria-label="Navegação móvel"
      // drop-shadow (not box-shadow) so the shadow follows the curved cutout; shadow-tabbar of the layout.
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] drop-shadow-[0_-10px_30px_rgb(10_6_4/0.45)] md:hidden"
    >
      <div aria-hidden="true" className="absolute inset-0 flex">
        <div className="flex-1 rounded-tl-[40px] bg-card" />
        <div className="flex w-[120px] shrink-0 flex-col">
          <svg viewBox="0 0 120 80" preserveAspectRatio="none" className="h-20 w-full fill-card">
            <path d="M0 0C24 0 30 44 60 44C90 44 96 0 120 0V80H0Z" />
          </svg>
          <div className="flex-1 bg-card" />
        </div>
        <div className="flex-1 rounded-tr-[40px] bg-card" />
      </div>
      <ul className="relative grid h-24 grid-cols-5 items-center">
        <li>
          <Link to="/" activeOptions={{ exact: true }} aria-label="Início" className={item}>
            <House aria-hidden="true" className="size-6" />
          </Link>
        </li>
        <li>
          <Link to="/favorites" aria-label="Favoritos" className={item}>
            <Heart aria-hidden="true" className="size-6" />
          </Link>
        </li>
        <li>
          <button
            type="button"
            aria-label="Explorar"
            onClick={() => void explore()}
            className="absolute -top-[30px] left-1/2 flex size-[65px] -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-b from-[#9a6638] to-primary text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
          >
            <ScanSearch aria-hidden="true" className="size-7" />
          </button>
        </li>
        <li>
          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})` : 'Carrinho'}
            className={item}
          >
            <ShoppingBag aria-hidden="true" className="size-6" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {cartCount}
              </span>
            )}
          </Link>
        </li>
        <li>
          {user ? (
            <Link to="/profile" aria-label={`Meu perfil (${user.displayName})`} className={item}>
              <User aria-hidden="true" className="size-6" />
            </Link>
          ) : (
            <Link to="/login" search={{ redirect: undefined, reason: undefined }} aria-label="Entrar" className={item}>
              <User aria-hidden="true" className="size-6" />
            </Link>
          )}
        </li>
      </ul>
    </nav>
  )
}
