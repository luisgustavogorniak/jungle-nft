import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { applyServerErrors } from '@/lib/form-errors'
import { useLogin, useRegister } from './session'

const loginFormSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
})
type LoginFormValues = z.infer<typeof loginFormSchema>

const registerFormSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Use pelo menos 3 caracteres')
      .max(30, 'Use no máximo 30 caracteres')
      .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, ponto e sublinhado'),
    email: z.email('Informe um e-mail válido'),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
type RegisterFormValues = z.infer<typeof registerFormSchema>

function ServerError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    login.mutateAsync(values).then(onSuccess, (error: unknown) =>
      applyServerErrors(error, form.setError, ['email', 'password']),
    ),
  )

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-3" aria-label="Entrar">
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        required
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...form.register('password')}
      />
      <ServerError message={errors.root?.server?.message} />
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useRegister()
  const form = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ confirmPassword: _confirm, ...values }) =>
    register.mutateAsync(values).then(onSuccess, (error: unknown) =>
      applyServerErrors(error, form.setError, ['username', 'email', 'password']),
    ),
  )

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-3" aria-label="Criar conta">
      <TextField
        label="Nome de usuário"
        autoComplete="username"
        required
        error={errors.username?.message}
        {...form.register('username')}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        required
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        error={errors.password?.message}
        {...form.register('password')}
      />
      <TextField
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <ServerError message={errors.root?.server?.message} />
      <Button type="submit" disabled={register.isPending}>
        {register.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  )
}
