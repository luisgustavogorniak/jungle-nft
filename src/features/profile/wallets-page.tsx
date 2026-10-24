import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/form-errors'
import { WalletForm } from './wallet-form'
import { useWallets } from './queries'

/** "Carteiras" (D9): the primary and the secondary wallet, each saved on its own. */
export function WalletsPage({ userId }: { userId: string }) {
  const wallets = useWallets(userId)
  const [adding, setAdding] = useState(false)

  if (wallets.isPending) return <Skeleton className="h-96 w-full" />
  if (wallets.isError) return <p role="alert">{errorMessage(wallets.error)}</p>

  const primary = wallets.data.find((wallet) => wallet.slot === 'primary')
  const secondary = wallets.data.find((wallet) => wallet.slot === 'secondary')

  return (
    <>
      <section aria-labelledby="primary-wallet" className="grid content-start gap-5">
        <div className="grid gap-2">
          <h1 id="primary-wallet" className="text-lg font-bold">
            Carteira principal
          </h1>
          <p className="text-sm text-copy">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        </div>
        {/* The key remounts the form with the saved values after each save. */}
        <WalletForm key={primary?.updatedAt ?? 'new'} userId={userId} slot="primary" wallet={primary} />
      </section>

      <section aria-labelledby="secondary-wallet" className="grid content-start gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 id="secondary-wallet" className="text-lg font-bold">
            Carteira secundária
          </h2>
          {!secondary && !adding && (
            <button type="button" className="font-medium text-highlight underline" onClick={() => setAdding(true)}>
              Adicionar
            </button>
          )}
        </div>
        {secondary || adding ? (
          <WalletForm
            key={secondary?.updatedAt ?? 'new'}
            userId={userId}
            slot="secondary"
            wallet={secondary}
            primary={primary}
          />
        ) : (
          <p className="text-sm text-copy">Você ainda não adicionou uma carteira secundária.</p>
        )}
      </section>
    </>
  )
}
