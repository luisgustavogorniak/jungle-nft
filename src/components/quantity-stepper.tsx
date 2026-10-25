import { Minus, Plus } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'

/** Largest quantity a user can ask for in one line (the stock may be smaller). */
export const MAX_QUANTITY = 10

type Props = {
  value: number
  max: number
  onChange: (value: number) => void
  /** Accessible name of the group, e.g. "Quantidade de Emerald Ape #042". */
  label?: string
  disabled?: boolean
  /** Shows the "Qtd." caption (mobile buy bar). */
  caption?: boolean
  /** Small circles of the cart table (20px on desktop). */
  compact?: boolean
  className?: string
}

/** Minus is disabled at 1 and plus at the limit, so the buttons never fail silently. */
export function QuantityStepper({ value, max, onChange, label = 'Quantidade', disabled = false, caption = false, compact = false, className }: Props) {
  const button = cn(
    'size-6 rounded-full bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_rgb(20_13_10/0.15)] hover:bg-primary/85 disabled:bg-secondary disabled:text-[#55321f] disabled:opacity-100 disabled:shadow-none [&_svg]:size-4',
    compact ? 'md:size-5 md:[&_svg]:size-3' : 'md:size-8 md:[&_svg]:size-5',
  )
  return (
    <div role="group" aria-label={label} className={cn('flex items-center gap-3 md:gap-4', className)}>
      {caption && (
        <span className="text-sm font-bold md:hidden" aria-hidden="true">
          Qtd.
        </span>
      )}
      <Button type="button" size="icon-xs" className={button} aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>
        <Minus />
      </Button>
      <output aria-live="polite" aria-label="Quantidade selecionada" className="min-w-4 text-center font-bold">
        {value}
      </output>
      <Button type="button" size="icon-xs" className={button} aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Plus />
      </Button>
    </div>
  )
}
