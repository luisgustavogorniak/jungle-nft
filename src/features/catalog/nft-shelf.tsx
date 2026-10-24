import { useQuery } from '@tanstack/react-query'
import type { Nft } from '@/api/contracts'
import { NftCard } from './nft-card'
import { nftListQueryOptions } from './queries'

/**
 * A row of five NFT cards under a titled hairline (desktop only). Same category first,
 * other popular NFTs complete the row when the category is small.
 */
export function NftShelf({ title, nft, exclude = [] }: { title: string; nft?: Nft; exclude?: string[] }) {
  const { data } = useQuery(nftListQueryOptions({ sort: 'popular', pageSize: 24 }))
  const others = (data?.items ?? []).filter((item) => item.id !== nft?.id && !exclude.includes(item.id))
  const sameCategory = others.filter((item) => item.category === nft?.category)
  const rest = others.filter((item) => item.category !== nft?.category)
  const shown = [...sameCategory, ...rest].slice(0, 5)
  if (shown.length === 0) return null
  return (
    <section aria-labelledby="shelf-title" className="hidden gap-6 pt-6 md:grid">
      <h2 id="shelf-title" className="border-b border-border pb-2 text-[17px] font-bold text-highlight">
        {title}
      </h2>
      <ul className="grid grid-cols-5 gap-4">
        {shown.map((item) => (
          <li key={item.id}>
            <NftCard nft={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}
