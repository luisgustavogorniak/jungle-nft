import { Link } from '@tanstack/react-router'
import type { Nft } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'

// Mobile: rounded gradient tile (r20). Desktop: flat card with a rounded artwork (r15).
const tile = 'rounded-[20px] bg-gradient-to-b from-card to-raised p-1 md:rounded-none md:bg-card md:bg-none md:px-1 md:pt-7 md:pb-6'
const art = 'aspect-[7/8] w-full rounded-[20px] object-cover md:aspect-square md:rounded-[15px]'

export function NftCard({ nft, priority = false }: { nft: Nft; priority?: boolean }) {
  return (
    <article>
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="group grid gap-3 rounded-[20px] outline-none focus-visible:ring-3 focus-visible:ring-ring md:rounded-none"
      >
        <div className={tile}>
          <div className="relative overflow-hidden rounded-[20px] md:rounded-[15px]">
            {/* The name is in the link text, so the artwork is decorative. */}
            <img
              src={nft.thumbnail}
              alt=""
              width={480}
              height={480}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              className={art}
            />
            {nft.rarity === 'rare' && (
              <span className="absolute top-0 left-0 rounded-br-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground md:text-base">
                RARO
              </span>
            )}
          </div>
        </div>
        <div className="grid gap-1 px-1 md:px-0">
          <h3 className="text-[15px] md:text-base">{nft.name}</h3>
          <p className="flex flex-wrap items-baseline gap-x-2 text-base font-bold text-highlight md:text-lg">
            <span>{formatEth(nft.price)}</span>
            {nft.oldPrice && (
              <span className="font-normal text-muted-foreground line-through">
                <span className="sr-only">Preço anterior </span>
                {formatEth(nft.oldPrice)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  )
}

/** Same box model as NftCard, so loading does not shift the layout. */
export function NftCardSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      <div className={tile}>
        <Skeleton className={`${art} md:rounded-[15px]`} />
      </div>
      <div className="grid gap-1 px-1 md:px-0">
        <Skeleton className="h-[22px] w-3/4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    </div>
  )
}
