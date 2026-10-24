import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { profileFieldsSchema, type User } from '@/api/contracts'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { ServerError } from '@/features/auth/auth-forms'
import { applyServerErrors } from '@/lib/form-errors'
import { AVATAR_ACCEPT, avatarFromFile } from './avatar-image'
import { useUpdateProfile } from './queries'

// ENS and nickname are optional (the account may have none): empty becomes null on submit.
const profileFormSchema = profileFieldsSchema
  .pick({ username: true, displayName: true, email: true, avatarUrl: true })
  .extend({
    ensName: z.union([z.literal(''), profileFieldsSchema.shape.ensName.unwrap()]),
    walletNickname: z.union([z.literal(''), profileFieldsSchema.shape.walletNickname.unwrap()]),
  })
type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile(user.id)
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      ensName: user.ensName ?? '',
      walletNickname: user.walletNickname ?? '',
    },
  })
  const { errors } = form.formState
  const fileInput = useRef<HTMLInputElement>(null)
  const [avatarError, setAvatarError] = useState<string>()
  const avatarUrl = useWatch({ control: form.control, name: 'avatarUrl' })

  const chooseAvatar = async (file: File | undefined) => {
    if (!file) return
    try {
      form.setValue('avatarUrl', await avatarFromFile(file), { shouldDirty: true })
      setAvatarError(undefined)
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Não foi possível usar essa imagem.')
    }
  }

  const onSubmit = form.handleSubmit((values) =>
    update
      .mutateAsync({ ...values, ensName: values.ensName || null, walletNickname: values.walletNickname || null })
      .then(
        () => toast.success('Perfil atualizado'),
        (error: unknown) => applyServerErrors(error, form.setError, Object.keys(values) as Array<keyof ProfileFormValues>),
      ),
  )

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Perfil do colecionador" className="grid content-start gap-5">
      <h1 className="text-lg font-bold">Perfil do colecionador</h1>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
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
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField label="Nome ENS" placeholder="nome.eth" error={errors.ensName?.message} {...form.register('ensName')} />
        <TextField label="Apelido da carteira" error={errors.walletNickname?.message} {...form.register('walletNickname')} />
        <div className="flex items-center gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Seu avatar" className="size-full object-cover" />
            ) : (
              <ImageIcon aria-hidden="true" className="size-8 text-copy" />
            )}
          </div>
          <div className="grid justify-items-start gap-1">
            <div className="flex items-center gap-4">
              <input
                ref={fileInput}
                type="file"
                accept={AVATAR_ACCEPT}
                aria-label="Escolher imagem do avatar"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  void chooseAvatar(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <Button type="button" size="sm" onClick={() => fileInput.current?.click()}>
                Alterar
              </Button>
              {avatarUrl && (
                <button
                  type="button"
                  className="text-sm text-highlight underline"
                  onClick={() => form.setValue('avatarUrl', null, { shouldDirty: true })}
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-copy">PNG, JPG ou WebP, até 5 MB.</p>
            {(avatarError ?? errors.avatarUrl?.message) && (
              <p role="alert" className="text-xs text-destructive">
                {avatarError ?? errors.avatarUrl?.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <ServerError message={errors.root?.server?.message} />
      <Button type="submit" className="min-w-[131px] justify-self-start" disabled={update.isPending}>
        {update.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}
