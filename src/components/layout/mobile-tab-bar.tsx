import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ShoppingBag, User } from 'lucide-react'
import { useCartCount } from '@/features/cart/queries'
import { useSession } from '@/features/auth/session'

const item =
  'relative flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs text-foreground [&.active]:text-highlight [&.active]:font-bold'

/**
 * Mobile navigation (below 768px), replacing the desktop header as in the layout.
 * The central scan FAB of the layout is omitted: it has no defined action.
 */
export function MobileTabBar() {
  const { user } = useSession()
  const cartCount = useCartCount()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // The detail page has its own buy bar in the layout, with no tab bar.
  if (pathname.startsWith('/nfts/')) return null

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-4xl bg-card px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-tabbar md:hidden"
    >
      <ul className="flex items-center justify-around">
        <li>
          <Link to="/" activeOptions={{ exact: true }} className={item}>
            <House className="size-6" />
            Início
          </Link>
        </li>
        <li>
          <Link to="/favorites" className={item}>
            <Heart className="size-6" />
            Favoritos
          </Link>
        </li>
        <li>
          <Link
            to="/cart"
            aria-label={cartCount > 0 ? `Carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})` : 'Carrinho'}
            className={item}
          >
            <ShoppingBag className="size-6" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-3 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {cartCount}
              </span>
            )}
            Carrinho
          </Link>
        </li>
        <li>
          {user ? (
            <Link to="/profile" aria-label={`Meu perfil (${user.displayName})`} className={item}>
              <User className="size-6" />
              Perfil
            </Link>
          ) : (
            <Link to="/login" search={{ redirect: undefined, reason: undefined }} aria-label="Entrar" className={item}>
              <User className="size-6" />
              Entrar
            </Link>
          )}
        </li>
      </ul>
    </nav>
  )
}
