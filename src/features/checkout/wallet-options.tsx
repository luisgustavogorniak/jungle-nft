import type { UseFormRegisterReturn } from 'react-hook-form'
import { Wallet as WalletIcon } from 'lucide-react'
import type { Wallet, WalletProvider } from '@/api/contracts'
import { networkLabels, providerLabels, shortAddress } from './labels'

/** Order of the layout (D4, M4). */
const providerOrder: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

const medallions: Record<WalletProvider, React.ReactNode> = {
  walletconnect: 'W',
  metamask: 'M',
  coinbase: <WalletIcon className="size-4" />,
}

/** Desktop: 45px rows, the selected one with a primary border (D4). */
export function ProviderOptionsDesktop({ field, value }: { field: UseFormRegisterReturn; value: WalletProvider }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 w-full text-center font-bold">Carteira e rede</legend>
      {providerOrder.map((provider) => (
        <label
          key={provider}
          className={`flex h-[45px] cursor-pointer items-center gap-3 rounded-[3px] border px-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/40 ${
            value === provider ? 'border-primary' : 'border-border'
          }`}
        >
          <input type="radio" value={provider} {...field} className="kurio-radio" />
          {provider === 'walletconnect' ? (
            <span className="flex items-center gap-2">
              WalletConnect
              <span aria-hidden="true" className="rounded-[3px] bg-deep px-2 py-1 text-[8px] font-bold text-highlight">
                METAMASK • WALLETCONNECT • COINBASE
              </span>
            </span>
          ) : (
            providerLabels[provider]
          )}
        </label>
      ))}
    </fieldset>
  )
}

/** Mobile: 65px cards with a medallion and the radio on the right (M4). */
export function ProviderOptionsMobile({ field }: { field: UseFormRegisterReturn }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-4 font-bold">Carteira e rede</legend>
      {providerOrder.map((provider) => (
        <label
          key={provider}
          className="flex h-[65px] cursor-pointer items-center gap-4 rounded-[15px] bg-card px-4 shadow-card has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
        >
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-bold text-highlight">
            {medallions[provider]}
          </span>
          <span className="flex-1">{providerLabels[provider]}</span>
          <input type="radio" value={provider} {...field} className="kurio-radio" />
        </label>
      ))}
    </fieldset>
  )
}

/** Mobile: registered wallets as cards (M4). */
export function WalletCards({
  wallets,
  value,
  onSelect,
}: {
  wallets: Wallet[]
  value: string
  onSelect: (wallet: Wallet) => void
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-4 font-bold">Carteira conectada</legend>
      {wallets.map((wallet) => (
        <label
          key={wallet.id}
          className="flex cursor-pointer items-start gap-4 rounded-[14px] bg-card px-5 py-3.5 shadow-card-y has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
        >
          <input
            type="radio"
            name="wallet"
            checked={value === wallet.id}
            onChange={() => onSelect(wallet)}
            className="kurio-radio mt-1"
          />
          <span className="grid gap-0.5">
            <span className="font-bold">{wallet.nickname}</span>
            <span className="text-sm text-copy">{shortAddress(wallet.address)}</span>
            <span className="text-sm text-copy">Rede {wallet.network === 'ethereum' ? 'principal ' : ''}{networkLabels[wallet.network]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
