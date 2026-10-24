import placeholderUrl from '@/assets/nft-placeholder.svg'

// Every image dropped into src/assets/nfts/ is picked up at build time.
const assets = import.meta.glob<string>('/src/assets/nfts/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

// Indexed by file stem, so "emerald-ape.png" also matches "emerald-ape.webp".
const byStem = new Map(
  Object.entries(assets).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url]),
)

export function resolveNftImage(file: string): string {
  return byStem.get(file.replace(/\.\w+$/, '')) ?? placeholderUrl
}
