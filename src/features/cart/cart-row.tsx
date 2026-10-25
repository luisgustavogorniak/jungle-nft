import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import type { CartItem } from '@/api/contracts'
import { MAX_QUANTITY, QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'
import { PendingOrderIssue } from '@/features/orders/pending-order-notice'
import { formatEth, mulEth } from '@/lib/eth'
import { useIsDesktop } from '@/lib/use-media-query'
import { useRemoveCartItem, useUpdateCartItem } from './queries'

/** Columns shared by the desktop header and rows: NFT, unit price, quantity, total, remove. */
export const ROW_COLUMNS = 'grid-cols-[minmax(0,1fr)_100px_150px_110px_40px]'

function useLineActions(item: CartItem) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const ref = { nftId: item.nftId, editionId: item.editionId }
  return {
    max: Math.max(1, Math.min(item.available, MAX_QUANTITY)),
    total: formatEth(mulEth(item.unitPrice, item.quantity)),
    setQuantity: (quantity: number) => update.mutate({ ...ref, quantity }),
    remove: () => remove.mutate(ref),
    removing: remove.isPending,
  }
}

function RemoveButton({ name, onClick, disabled }: { name: string; onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover ${name} do carrinho`} disabled={disabled} onClick={onClick}>
      <Trash2 className="size-5 text-copy" />
    </Button>
  )
}

/** Desktop: table row of 70px. */
function DesktopRow({ item }: { item: CartItem }) {
  const line = useLineActions(item)
  return (
    <div className={`grid ${ROW_COLUMNS} min-h-[70px] items-center gap-x-4 bg-card`}>
      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="flex min-w-0 items-center gap-4">
        <img src={item.image} alt="" width={70} height={70} className="size-[70px] shrink-0 object-cover" />
        <span className="min-w-0">
          <span className="block truncate font-bold">{item.name}</span>
          <span className="flex flex-wrap gap-x-3 text-sm text-copy">
            <span>ID do token: {item.tokenId}</span>
            <span>Edição: {item.editionLabel}</span>
          </span>
        </span>
      </Link>
      <p className="font-bold text-copy">{formatEth(item.unitPrice)}</p>
      <QuantityStepper compact label={`Quantidade de ${item.name}`} value={item.quantity} max={line.max} onChange={line.setQuantity} />
      <p className="font-bold text-highlight">{line.total}</p>
      <RemoveButton name={item.name} onClick={line.remove} disabled={line.removing} />
    </div>
  )
}

/**
 * Mobile: card of 100px. The trash sits on the name line and the stepper on the price line,
 * so the two controls never overlap (the Figma frame draws the trash over the "+").
 */
function MobileRow({ item }: { item: CartItem }) {
  const line = useLineActions(item)
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] overflow-hidden rounded-[14px] bg-card shadow-card-y">
      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} aria-hidden="true" tabIndex={-1}>
        <img src={item.image} alt="" width={100} height={100} className="size-[100px] object-cover" />
      </Link>
      <div className="grid min-w-0 content-between gap-1 py-2 pr-2 pl-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="block truncate font-bold">
              {item.name}
            </Link>
            <p className="text-sm text-copy">Edição: {item.editionLabel}</p>
          </div>
          <RemoveButton name={item.name} onClick={line.remove} disabled={line.removing} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-bold text-highlight">{line.total}</p>
          <QuantityStepper label={`Quantidade de ${item.name}`} value={item.quantity} max={line.max} onChange={line.setQuantity} />
        </div>
      </div>
    </div>
  )
}

/**
 * One cart line. `issue` is the availability problem the quote reported for it;
 * `pendingOrderId` is set when the user's own pending order holds those units.
 */
export function CartRow({ item, issue, pendingOrderId }: { item: CartItem; issue?: string; pendingOrderId?: string }) {
  const isDesktop = useIsDesktop()
  return (
    <li aria-label={`${item.name}, edição ${item.editionLabel}`} className="grid gap-2">
      {isDesktop ? <DesktopRow item={item} /> : <MobileRow item={item} />}
      {issue &&
        (pendingOrderId ? (
          <PendingOrderIssue orderId={pendingOrderId} />
        ) : (
          <p role="alert" className="text-sm text-destructive">
            {issue}
          </p>
        ))}
    </li>
  )
}
