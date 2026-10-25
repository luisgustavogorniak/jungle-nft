import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ShoppingBag, User } from 'lucide-react'
import { hasTabBar } from './tab-bar-visibility'
import { useCartCount } from '@/features/cart/queries'
import { useSession } from '@/features/auth/session'

const item =
  'relative flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-foreground [&.active]:text-highlight [&.active]:font-bold'

/**
 * Mobile navigation (below 768px), replacing the desktop header as in the layout.
 * The central scan FAB of the layout is omitted: it has no defined action.
 */
export function MobileTabBar() {
  const { user } = useSession()
  const cartCount = useCartCount()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (!hasTabBar(pathname)) return null

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-4xl bg-card px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-tabbar md:hidden"
    >
      <ul className="flex items-center justify-around">
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
          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})` : 'Carrinho'}
            className={item}
          >
            <ShoppingBag aria-hidden="true" className="size-6" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-3 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
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
