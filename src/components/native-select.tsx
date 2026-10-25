import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from 'cn'

/** Native <select> (keyboard and screen reader behavior for free) with the chevron of the layout instead of the browser arrow. */
export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative grid">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-sm border border-input bg-transparent pr-9 pl-3 text-sm focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none aria-invalid:border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
