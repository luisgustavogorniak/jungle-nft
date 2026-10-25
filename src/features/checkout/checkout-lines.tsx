import type { CartItem, Quote } from '@/api/contracts'
import { formatEth } from '@/lib/eth'

/**
 * "Seus NFTs" (D4): quantities and totals come from the quote; name, token and
 * image from the cart line of the same NFT and edition.
 */
export function CheckoutLines({ quote, items }: { quote: Quote; items: CartItem[] }) {
  return (
    <section aria-labelledby="checkout-lines" className="grid gap-3">
      <h2 id="checkout-lines" className="font-bold">
        Seus NFTs
      </h2>
      <div aria-hidden="true" className="flex justify-between border-b border-border pb-2 font-bold">
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <ul aria-label="NFTs do pedido" className="grid gap-3">
        {quote.lines.map((line) => {
          const item = items.find((candidate) => candidate.nftId === line.nftId && candidate.editionId === line.editionId)
          return (
            <li key={`${line.nftId}-${line.editionId}`} className="flex min-h-[70px] items-center gap-3 bg-card pr-3">
              {item && <img src={item.image} alt="" width={70} height={70} className="size-[70px] shrink-0 object-cover" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{item?.name ?? line.nftId}</span>
                <span className="flex flex-wrap gap-x-3 text-sm text-copy">
                  <span>ID do token: {item?.tokenId}</span>
                  <span>Edição: {item?.editionLabel}</span>
                </span>
              </span>
              <span className="text-sm text-copy">(x {line.quantity})</span>
              <span className="font-bold text-highlight">{formatEth(line.lineTotal)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
