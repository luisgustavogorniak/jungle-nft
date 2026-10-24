import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from 'cn'
import { pageWindow } from './page-window'

const box = 'flex size-[35px] items-center justify-center rounded-sm text-lg'

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const go = (n: number) => (prev: Record<string, unknown>) => ({ ...prev, page: n === 1 ? undefined : n })

  return (
    <nav aria-label="Paginação" className="flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <Link to="/" search={go(page - 1)} hash="catalogo" aria-label="Página anterior" className={cn(box, 'border border-border')}>
              <ArrowLeft className="size-4" />
            </Link>
          </li>
        )}
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className={box}>
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                to="/"
                search={go(entry)}
                hash="catalogo"
                aria-label={`Página ${entry}`}
                aria-current={entry === page ? 'page' : undefined}
                className={cn(box, entry === page ? 'bg-primary font-bold text-primary-foreground' : 'border border-border hover:bg-secondary')}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <Link to="/" search={go(page + 1)} hash="catalogo" aria-label="Próxima página" className={cn(box, 'border border-border')}>
              <ArrowRight className="size-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
