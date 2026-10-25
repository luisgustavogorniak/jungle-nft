import { useId, type ComponentProps } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type DefaultValues } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  isAddressOrEns,
  networkIds,
  walletInputSchema,
  walletProviders,
  type Wallet,
  type WalletSlot,
} from '@/api/contracts'
import { TextField } from '@/components/text-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect } from '@/components/native-select'
import { Label } from '@/components/ui/label'
import { ServerError } from '@/features/auth/auth-forms'
import { networkLabels, providerLabels } from '@/features/checkout/labels'
import { applyServerErrors } from '@/lib/form-errors'
import { useSaveWallet } from './queries'

// The optional ENS/secondary address is an empty string in the form and null in the API.
const walletFormSchema = walletInputSchema.omit({ secondaryAddress: true }).extend({
  network: z.enum(networkIds, 'Selecione uma rede'),
  provider: z.enum(walletProviders, 'Selecione uma carteira'),
  secondaryAddress: z
    .string()
    .trim()
    .refine((value) => value === '' || isAddressOrEns(value), 'Use um endereço 0x ou um nome .eth'),
})
type WalletFormValues = z.infer<typeof walletFormSchema>

// No network or provider yet: the selects start on their placeholder option.
const emptyValues: DefaultValues<WalletFormValues> = {
  displayName: '',
  nickname: '',
  profileName: '',
  address: '',
  secondaryAddress: '',
  referralCode: '',
  email: '',
  ensName: '',
}

const valuesOf = (wallet: Wallet | undefined): DefaultValues<WalletFormValues> =>
  wallet
    ? {
        displayName: wallet.displayName,
        nickname: wallet.nickname,
        network: wallet.network,
        profileName: wallet.profileName,
        address: wallet.address,
        secondaryAddress: wallet.secondaryAddress ?? '',
        provider: wallet.provider,
        referralCode: wallet.referralCode,
        email: wallet.email,
        ensName: wallet.ensName,
      }
    : emptyValues

const fieldNames = Object.keys(walletFormSchema.shape) as Array<keyof WalletFormValues>

function SelectField({
  label,
  error,
  options,
  placeholder,
  ...selectProps
}: ComponentProps<'select'> & {
  label: string
  error?: string
  placeholder: string
  options: Array<[string, string]>
}) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        <span aria-hidden="true" className="text-[22px] leading-none text-coral">*</span>
      </Label>
      <NativeSelect
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...selectProps}
      >
        <option value="" disabled className="bg-card">
          {placeholder}
        </option>
        {options.map(([value, text]) => (
          <option key={value} value={value} className="bg-card">
            {text}
          </option>
        ))}
      </NativeSelect>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type Props = {
  userId: string
  slot: WalletSlot
  /** Saved wallet of this slot, if any. */
  wallet?: Wallet
  /** For the secondary form: lets it start as a copy of the primary wallet. */
  primary?: Wallet
}

export function WalletForm({ userId, slot, wallet, primary }: Props) {
  const save = useSaveWallet(userId)
  const form = useForm<WalletFormValues>({ resolver: zodResolver(walletFormSchema), defaultValues: valuesOf(wallet) })
  const { errors } = form.formState
  const sameAsPrimaryId = useId()

  const onSubmit = form.handleSubmit((values) =>
    save
      .mutateAsync({ slot, input: { ...values, secondaryAddress: values.secondaryAddress || null } })
      .then(
        () => toast.success('Carteira salva'),
        (error: unknown) => applyServerErrors(error, form.setError, fieldNames),
      ),
  )

  const label = slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'

  return (
    <form noValidate onSubmit={onSubmit} aria-label={label} className="grid content-start gap-5">
      {slot === 'secondary' && primary && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={sameAsPrimaryId}
            onCheckedChange={(checked) => form.reset(checked === true ? valuesOf(primary) : valuesOf(wallet))}
          />
          <Label htmlFor={sameAsPrimaryId}>Igual à carteira principal</Label>
        </div>
      )}

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Apelido da carteira" required error={errors.nickname?.message} {...form.register('nickname')} />
        <SelectField
          label="Rede"
          placeholder="Selecione uma rede"
          error={errors.network?.message}
          options={networkIds.map((id) => [id, networkLabels[id]])}
          {...form.register('network')}
        />
        <TextField label="Nome do perfil" required error={errors.profileName?.message} {...form.register('profileName')} />
        <TextField
          label="Endereço da carteira"
          placeholder="Endereço 0x da carteira"
          required
          error={errors.address?.message}
          {...form.register('address')}
        />
        <TextField
          label="ENS ou carteira secundária (opcional)"
          error={errors.secondaryAddress?.message}
          {...form.register('secondaryAddress')}
        />
        <SelectField
          label="Tipo de carteira"
          placeholder="Selecione uma carteira"
          error={errors.provider?.message}
          options={walletProviders.map((id) => [id, providerLabels[id]])}
          {...form.register('provider')}
        />
        <TextField
          label="Código de indicação"
          required
          error={errors.referralCode?.message}
          {...form.register('referralCode', { setValueAs: (value: string) => value.trim().toUpperCase() })}
        />
        <TextField
          label="E-mail"
          type="email"
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField label="Nome ENS" placeholder="nome.eth" required error={errors.ensName?.message} {...form.register('ensName')} />
      </div>

      <ServerError message={errors.root?.server?.message} />
      <Button type="submit" className="min-w-[131px] justify-self-start" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : 'Salvar carteira'}
      </Button>
    </form>
  )
}
