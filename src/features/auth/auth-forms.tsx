import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { OutOfScopeLink } from '@/components/layout/out-of-scope'
import { FacebookIcon, GoogleIcon } from '@/components/brand-icons'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { applyServerErrors } from '@/lib/form-errors'
import { useIsDesktop } from '@/lib/use-media-query'
import { useLogin, useRegister } from './session'

/** 50px / r10 on mobile (M5), 40px / r5 in the desktop modal (D6). */
const authInput = 'h-[50px] rounded-[10px] md:h-10 md:rounded-[5px]'
/** 60px / r10 on mobile, 45px / r5 on desktop. */
const authSubmit = 'mt-7 text-base h-[60px] rounded-[10px] md:mt-0 md:h-[45px] md:rounded-[5px]'

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

export function ServerError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

/** "Ou continue com" + social buttons. Social sign-in is outside the challenge scope, so they answer honestly. */
function SocialSignIn() {
  const social = 'h-10 gap-3 rounded-[5px] border border-input text-[13px] font-medium text-copy hover:text-foreground flex items-center justify-center'
  return (
    <div className="mt-7 grid gap-4 md:mt-0 md:gap-3">
      <p className="flex items-center gap-3 text-[13px] text-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border md:-mx-20">
        Ou continue com
      </p>
      <OutOfScopeLink className={social}>
        <GoogleIcon className="size-[22px]" />
        Continuar com Google
      </OutOfScopeLink>
      <OutOfScopeLink className={social}>
        <FacebookIcon className="size-6" />
        Continuar com Facebook
      </OutOfScopeLink>
    </div>
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
        hideLabel
        className={authInput}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="***********"
        required
        hideLabel
        className={authInput}
        error={errors.password?.message}
        {...form.register('password')}
      />
      <OutOfScopeLink className="justify-self-end text-sm text-highlight hover:underline">Esqueceu a senha?</OutOfScopeLink>
      <ServerError message={errors.root?.server?.message} />
      <Button type="submit" className={authSubmit} disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
      <SocialSignIn />
    </form>
  )
}

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useRegister()
  const isDesktop = useIsDesktop()
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
        placeholder="Nome de usuário"
        required
        hideLabel
        className={authInput}
        error={errors.username?.message}
        {...form.register('username')}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        required
        hideLabel
        className={authInput}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        placeholder="Senha"
        required
        hideLabel
        className={authInput}
        error={errors.password?.message}
        {...form.register('password')}
      />
      <TextField
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        required
        hideLabel
        className={authInput}
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <ServerError message={errors.root?.server?.message} />
      <Button type="submit" className={authSubmit} disabled={register.isPending}>
        {register.isPending ? 'Criando conta…' : isDesktop ? 'Criar conta' : 'Criar perfil'}
      </Button>
      <SocialSignIn />
    </form>
  )
}
