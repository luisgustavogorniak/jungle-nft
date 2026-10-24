import { useId, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string
  error?: string
}

/** Label + input + error message, wired with aria-invalid / aria-describedby. */
export function TextField({ label, error, required, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-coral">*</span>
        )}
      </Label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-required={required || undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
