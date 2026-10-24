import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from 'cn'

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string
  error?: string
}

/** Label + input + error message, wired with aria-invalid / aria-describedby. Password fields get a show/hide toggle. */
export function TextField({ label, error, required, id, type, className, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)

  const input = (
    <Input
      id={inputId}
      type={isPassword && revealed ? 'text' : type}
      className={cn(isPassword && 'pr-11', className)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      aria-required={required || undefined}
      {...inputProps}
    />
  )

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-coral">*</span>
        )}
      </Label>
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-sm text-secondary outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {revealed ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
          </button>
        </div>
      ) : (
        input
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
