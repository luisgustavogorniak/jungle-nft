import type { ComponentProps } from 'react'
import { cn } from 'cn'

/** Content column of the layout: 1200px, with page gutters below that. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-6 xl:px-0', className)} {...props} />
}
