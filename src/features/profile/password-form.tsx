import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { changePasswordRequestSchema } from '@/api/contracts'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { ServerError } from '@/features/auth/auth-forms'
import { applyServerErrors } from '@/lib/form-errors'
import { useChangePassword } from './queries'

const passwordFormSchema = changePasswordRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha') })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
type PasswordFormValues = z.infer<typeof passwordFormSchema>

export function PasswordForm() {
  const changePassword = useChangePassword()
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword }) =>
    changePassword.mutateAsync({ currentPassword, newPassword }).then(
      () => {
        form.reset()
        toast.success('Senha alterada')
      },
      (error: unknown) => applyServerErrors(error, form.setError, ['currentPassword', 'newPassword']),
    ),
  )

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Alterar senha" className="grid content-start gap-5">
      <h2 className="text-lg font-bold">Alterar senha</h2>
      <div className="grid gap-5 md:max-w-[calc(50%-0.75rem)]">
        <TextField
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          required
          error={errors.currentPassword?.message}
          {...form.register('currentPassword')}
        />
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <TextField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
      </div>
      <ServerError message={errors.root?.server?.message} />
      <Button type="submit" className="min-w-[131px] justify-self-start" disabled={changePassword.isPending}>
        {changePassword.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  )
}
