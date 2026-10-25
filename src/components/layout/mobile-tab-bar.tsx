import { useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanSearch, ShoppingBag, User, type LucideProps } from 'lucide-react'
import { SEARCH_INPUT_ID } from './site-header'
import { hasTabBar } from './tab-bar-visibility'
import { useCartCount } from '@/features/cart/queries'
import { useSession } from '@/features/auth/session'

const item =
  'relative mx-auto flex size-12 items-center justify-center rounded-full text-copy outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&.active]:text-highlight'

const RADIUS = 40
const NOTCH_HALF_WIDTH = 60
const NOTCH_DEPTH = 44

/** One closed outline: rounded top corners and the curved cutout under the FAB, sized to the bar. */
function barPath(width: number, height: number) {
  const mid = width / 2
  const [left, right] = [mid - NOTCH_HALF_WIDTH, mid + NOTCH_HALF_WIDTH]
  return [
    `M0 ${RADIUS}A${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} 0H${left}`,
    `C${left + 24} 0 ${mid - 30} ${NOTCH_DEPTH} ${mid} ${NOTCH_DEPTH}`,
    `C${mid + 30} ${NOTCH_DEPTH} ${right - 24} 0 ${right} 0`,
    `H${width - RADIUS}A${RADIUS} ${RADIUS} 0 0 1 ${width} ${RADIUS}V${height}H0Z`,
  ].join('')
}

/** Active tab gets the filled (bold) version of its icon, as in the layout. */
function TabIcon({ icon: Icon, active }: { icon: ComponentType<LucideProps>; active: boolean }) {
  return <Icon aria-hidden="true" className="size-6" fill={active ? 'currentColor' : 'none'} />
}

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
  const navRef = useRef<HTMLElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const visible = hasTabBar(pathname)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const measure = () => setSize({ width: nav.offsetWidth, height: nav.offsetHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [visible])

  if (!visible) return null

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
      ref={navRef}
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* A single shape; drop-shadow (not box-shadow) so the shadow follows the curved cutout (shadow-tabbar). */}
      <svg
        aria-hidden="true"
        width={size.width}
        height={size.height}
        className="absolute inset-0 overflow-visible fill-card drop-shadow-[0_-10px_30px_rgb(10_6_4/0.45)]"
      >
        <path d={barPath(size.width, size.height)} />
      </svg>
      <ul className="relative grid h-24 grid-cols-5 items-center">
        <li>
          <Link to="/" activeOptions={{ exact: true }} aria-label="Início" className={item}>
            {({ isActive }) => <TabIcon icon={House} active={isActive} />}
          </Link>
        </li>
        <li>
          <Link to="/favorites" aria-label="Favoritos" className={item}>
            {({ isActive }) => <TabIcon icon={Heart} active={isActive} />}
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
            {({ isActive }) => (
              <>
                <TabIcon icon={ShoppingBag} active={isActive} />
                {cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
                  >
                    {cartCount}
                  </span>
                )}
              </>
            )}
          </Link>
        </li>
        <li>
          {user ? (
            <Link to="/profile" aria-label={`Meu perfil (${user.displayName})`} className={item}>
              {({ isActive }) => <TabIcon icon={User} active={isActive} />}
            </Link>
          ) : (
            <Link to="/login" search={{ redirect: undefined, reason: undefined }} aria-label="Entrar" className={item}>
              {({ isActive }) => <TabIcon icon={User} active={isActive} />}
            </Link>
          )}
        </li>
      </ul>
    </nav>
  )
}
