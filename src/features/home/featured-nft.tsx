import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { nftQueryOptions } from '@/features/catalog/queries'

// The NFT on sale (it has a previous price), shown as the limited offer.
const FEATURED_ID = 'neon-vessel-552'

export function FeaturedNft() {
  const { data, isError } = useQuery(nftQueryOptions(FEATURED_ID))
  if (isError) return null
  return (
    <section aria-labelledby="featured-title" className="grid justify-items-center gap-3 text-center">
      <h2 id="featured-title" className="text-2xl font-bold text-highlight">
        NFT EM DESTAQUE
      </h2>
      <p className="text-[22px] font-bold">OFERTA LIMITADA</p>
      {data ? (
        <Link to="/nfts/$nftId" params={{ nftId: data.id }} className="block w-full overflow-hidden rounded-[22px] outline-none focus-visible:ring-3 focus-visible:ring-ring">
          <img src={data.thumbnail} alt={`${data.name}, em oferta`} width={310} height={368} loading="lazy" className="aspect-[310/368] w-full object-cover" />
        </Link>
      ) : (
        <Skeleton className="aspect-[310/368] w-full rounded-[22px]" />
      )}
    </section>
  )
}
