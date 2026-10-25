import { useRef } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HomePage } from '@/features/home/home-page'
import { useIsDesktop } from '@/lib/use-media-query'
import type { z } from 'zod'
import { LoginForm, RegisterForm } from './auth-forms'
import type { authSearchSchema } from './auth-search'
import { safeRedirect } from './session'

type Mode = 'login' | 'register'

const copy = {
  login: {
    title: 'Entrar',
    subtitle: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  register: {
    title: 'Criar perfil de colecionador',
    subtitle: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
} as const

/**
 * Desktop: the modal of the layout (D6/D7) over the home, opened by the URL itself, so direct access,
 * refresh and the return redirect keep working. Mobile has a page (M5/M6).
 */
export function AuthScreen({ mode, search }: { mode: Mode; search: z.infer<typeof authSearchSchema> }) {
  const isDesktop = useIsDesktop()
  const router = useRouter()
  const navigate = useNavigate()
  const firstField = useRef<HTMLDivElement>(null)
  const onSuccess = () => router.history.push(safeRedirect(search.redirect))
  const expired = search.reason === 'expired' && (
    <p role="status" className="text-sm">
      Sua sessão expirou. Entre novamente para continuar de onde parou.
    </p>
  )
  const form = mode === 'login' ? <LoginForm onSuccess={onSuccess} /> : <RegisterForm onSuccess={onSuccess} />

  if (!isDesktop) {
    return (
      <main className="mx-auto grid max-w-sm gap-4 p-8">
        <p className="text-center text-[32px] font-bold tracking-[0.1em]">KURIO</p>
        <h1 className="text-xl font-bold">{copy[mode].title}</h1>
        {expired}
        {form}
        <p className="text-sm">
          {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
          <Link to={mode === 'login' ? '/register' : '/login'} search={{ redirect: search.redirect }} className="underline">
            {mode === 'login' ? 'Crie uma conta' : 'Entre'}
          </Link>
        </p>
      </main>
    )
  }

  return (
    <>
      <HomePage />
      <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
        <DialogContent
          // Radix hides the rest of the page from assistive tech but does not set aria-modal.
          aria-modal="true"
          className="top-16 max-h-[calc(100%-5rem)] translate-y-0 gap-6 rounded-lg px-[80px] pt-12 pb-12 sm:max-w-[500px]"
          // Focus goes to the first field, not to the close button.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            firstField.current?.querySelector('input')?.focus()
          }}
        >
          <DialogTitle className="sr-only">{copy[mode].title}</DialogTitle>
          <Tabs
            value={mode}
            onValueChange={(value) =>
              void navigate({ to: value === 'login' ? '/login' : '/register', search: { redirect: search.redirect } })
            }
          >
            <TabsList variant="line" className="w-full justify-start gap-4">
              <TabsTrigger value="login" className="text-xl">
                Entrar
              </TabsTrigger>
              <span aria-hidden="true" className="h-6 w-px bg-coral" />
              <TabsTrigger value="register" className="text-xl">
                Criar conta
              </TabsTrigger>
            </TabsList>
            <DialogDescription className="mt-4 text-sm text-copy">{copy[mode].subtitle}</DialogDescription>
            <TabsContent value={mode} className="mt-4 grid gap-4">
              {expired}
              <div ref={firstField}>{form}</div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
