import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { Activity, Download, Heart, LifeBuoy, LogOut, Tag, UserRound, Wallet } from 'lucide-react'
import { cn } from 'cn'
import { Container } from '@/components/layout/container'
import { OutOfScopeLink } from '@/components/layout/out-of-scope'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/auth/session'

const sideItem =
  'flex h-[45px] w-full items-center gap-3 border-l-[6px] border-transparent px-4 text-left text-[15px] text-highlight hover:bg-secondary/40 [&.active]:border-primary [&.active]:font-bold'
const tab =
  'flex-1 border-b-2 border-transparent py-3 text-center text-sm text-foreground [&.active]:border-primary [&.active]:font-bold [&.active]:text-highlight'

/**
 * Shell of "Meu perfil" and "Carteiras" (D8/D9): sidebar on desktop. The layout
 * has no mobile frame: there the same two pages become tabs above one column.
 */
export function AccountLayout() {
  const logout = useLogout()
  const navigate = useNavigate()
  const signOut = () => {
    logout.mutate()
    void navigate({ to: '/' })
  }

  return (
    <main>
      <Container className="grid gap-6 py-4 md:grid-cols-[310px_minmax(0,1fr)] md:items-start md:gap-7 md:pt-8 md:pb-12">
        <nav aria-label="Conta" className="md:hidden">
          <ul className="flex border-b border-primary/40">
            <li className="flex flex-1">
              <Link to="/profile" activeOptions={{ exact: true }} className={tab}>
                Dados do perfil
              </Link>
            </li>
            <li className="flex flex-1">
              <Link to="/profile/wallets" className={tab}>
                Carteiras
              </Link>
            </li>
          </ul>
        </nav>

        <aside className="hidden bg-card py-2 md:block">
          <nav aria-label="Meu perfil">
            <h2 className="px-4 py-3 text-lg font-bold">Meu perfil</h2>
            <ul>
              <li>
                <Link to="/profile" activeOptions={{ exact: true }} className={sideItem}>
                  <UserRound className="size-5" />
                  Dados do perfil
                </Link>
              </li>
              <li>
                <Link to="/profile/wallets" className={sideItem}>
                  <Wallet className="size-5" />
                  Carteiras
                </Link>
              </li>
              <li>
                <OutOfScopeLink className={sideItem}>
                  <Activity className="size-5" />
                  Atividade
                </OutOfScopeLink>
              </li>
              <li>
                <Link to="/favorites" className={sideItem}>
                  <Heart className="size-5" />
                  Lista de interesse
                </Link>
              </li>
              <li>
                <OutOfScopeLink className={sideItem}>
                  <Tag className="size-5" />
                  Ofertas
                </OutOfScopeLink>
              </li>
              <li>
                <OutOfScopeLink className={sideItem}>
                  <Download className="size-5" />
                  Arquivos baixados
                </OutOfScopeLink>
              </li>
              <li>
                <OutOfScopeLink className={sideItem}>
                  <LifeBuoy className="size-5" />
                  Suporte
                </OutOfScopeLink>
              </li>
            </ul>
            <div className="mt-2 border-t border-primary/40 pt-2">
              <button type="button" onClick={signOut} className={cn(sideItem, 'font-bold')}>
                <LogOut className="size-5" />
                Sair
              </button>
            </div>
          </nav>
        </aside>

        <div className="grid min-w-0 gap-8">
          <Outlet />
          {/* On mobile there is no header: logout lives here. */}
          <Button variant="outline" className="md:hidden" onClick={signOut}>
            Sair
          </Button>
        </div>
      </Container>
    </main>
  )
}
