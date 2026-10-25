import { useId, useState } from 'react'
import { X } from 'lucide-react'
import type { Quote } from '@/api/contracts'
import { isApiError } from '@/api/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setCoupon } from './coupon'
import { useApplyCoupon } from './queries'

/**
 * Apply and remove a promotional code. A code is only kept after the API accepted it;
 * invalid and expired codes show the reason next to the field.
 */
export function CouponForm({ quote }: { quote: Quote | undefined }) {
  const id = useId()
  const apply = useApplyCoupon()
  const [code, setCode] = useState('')
  const [empty, setEmpty] = useState(false)

  const applied = quote?.coupon ?? null
  const message = empty
    ? 'Digite um código promocional.'
    : apply.isError
      ? isApiError(apply.error)
        ? (apply.error.fieldErrors?.couponCode ?? apply.error.message)
        : 'Não foi possível validar o código. Tente novamente.'
      : null

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) {
      setEmpty(true)
      return
    }
    setEmpty(false)
    apply.mutate(code.trim(), { onSuccess: () => setCode('') })
  }

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-bold sr-only md:not-sr-only">
        Código promocional
      </label>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex rounded-full border border-input bg-card shadow-card-y md:rounded-[3px] md:border-primary md:bg-transparent md:shadow-none"
      >
        <Input
          id={id}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setEmpty(false)
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional…"
          autoComplete="off"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          className="h-[50px] rounded-full border-0 bg-transparent px-4 text-xs focus-visible:ring-0 md:h-10 md:rounded-none"
        />
        <Button
          type="submit"
          variant="pill"
          disabled={apply.isPending}
          className="h-[50px] shrink-0 rounded-full px-6 md:h-10 md:rounded-none md:bg-primary md:bg-none"
        >
          {apply.isPending ? 'Validando…' : 'Aplicar'}
        </Button>
      </form>
      {message && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      {applied && (
        <p className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm">
          <span>
            <span className="font-bold">{applied.code}</span> aplicado: {applied.percentOff}% de desconto
          </span>
          <Button type="button" variant="ghost" size="xs" aria-label={`Remover cupom ${applied.code}`} onClick={() => setCoupon(null)}>
            <X />
            Remover
          </Button>
        </p>
      )}
    </div>
  )
}
