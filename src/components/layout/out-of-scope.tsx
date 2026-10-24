import type { ComponentProps } from 'react'
import { toast } from 'sonner'

/**
 * Entry points to pages the challenge leaves out (editorial, support, activity,
 * offers, downloads). They answer honestly instead of pretending to work.
 */
function notifyOutOfScope() {
  toast.info('Esta página não faz parte da demonstração.', { id: 'out-of-scope' })
}

export function OutOfScopeLink({ onClick, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event)
        notifyOutOfScope()
      }}
      {...props}
    />
  )
}
