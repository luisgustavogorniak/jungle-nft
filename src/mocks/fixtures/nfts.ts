import type { CategoryId, Edition, EditionId, NetworkId, Nft } from '@/api/contracts'

/** Stored without a resolved URL: `imageFile` is mapped to an asset when serialized. */
export type NftRecord = Omit<Nft, 'image'> & { imageFile: string }

type Seed = {
  number: string
  base: string
  price: string
  oldPrice?: string
  category: CategoryId
  network: NetworkId
  collection: string
  rare?: boolean
  attributes: string[]
}

// Order = "recently listed" order. The first nine reproduce the home grid of the layout.
const seeds: Seed[] = [
  { number: '042', base: 'Emerald Ape', price: '1.19', category: 'digital-art', network: 'ethereum', collection: 'Kurio Apes', attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  { number: '009', base: 'Sage Nomad', price: '1.69', category: 'photography', network: 'polygon', collection: 'Nomad Society', attributes: ['Deserto', 'Sálvia', 'Viajante'] },
  { number: '552', base: 'Neon Vessel', price: '1.99', oldPrice: '2.29', category: '3d-art', network: 'ethereum', collection: 'Neon Fleet', rare: true, attributes: ['Neon', 'Casco', 'Raro'] },
  { number: '118', base: 'Cosmic Bloom', price: '1.29', category: 'generative', network: 'solana', collection: 'Cosmic Garden', attributes: ['Pétalas', 'Nebulosa', 'Fractal'] },
  { number: '314', base: 'Violet Nomad', price: '1.39', category: 'photography', network: 'ethereum', collection: 'Nomad Society', attributes: ['Violeta', 'Crepúsculo', 'Viajante'] },
  { number: '088', base: 'Ivory Baron', price: '1.79', category: 'collectibles', network: 'polygon', collection: 'Baron Club', rare: true, attributes: ['Marfim', 'Cartola', 'Raro'] },
  { number: '207', base: 'Golden Beat', price: '0.99', category: 'music', network: 'ethereum', collection: 'Golden Records', attributes: ['Ouro', 'Batida', '120 BPM'] },
  { number: '071', base: 'Golden Frequency', price: '0.59', category: 'music', network: 'polygon', collection: 'Golden Records', attributes: ['Ouro', 'Onda', 'Analógico'] },
  { number: '160', base: 'Golden Signal', price: '0.39', category: 'music', network: 'solana', collection: 'Golden Records', attributes: ['Ouro', 'Antena', 'Ruído'] },
  { number: '233', base: 'Crimson Oracle', price: '2.45', category: 'digital-art', network: 'ethereum', collection: 'Kurio Editions', attributes: ['Carmesim', 'Visão', 'Ritual'] },
  { number: '017', base: 'Amber Pilot', price: '0.82', category: 'gaming', network: 'polygon', collection: 'Pixel Pilots', attributes: ['Âmbar', 'Capacete', 'Nível 7'] },
  { number: '401', base: 'Lunar Archive', price: '12.30', category: 'collectibles', network: 'ethereum', collection: 'Lunar Vault', rare: true, attributes: ['Lua', 'Arquivo', 'Raro'] },
  { number: '126', base: 'Rust Garden', price: '0.02', category: 'generative', network: 'polygon', collection: 'Cosmic Garden', attributes: ['Ferrugem', 'Musgo', 'Ruído'] },
  { number: '058', base: 'Copper Monk', price: '3.15', category: 'digital-art', network: 'solana', collection: 'Kurio Editions', attributes: ['Cobre', 'Manto', 'Silêncio'] },
  { number: '319', base: 'Echo Chamber', price: '0.45', category: 'music', network: 'ethereum', collection: 'Golden Records', attributes: ['Eco', 'Reverb', 'Fita'] },
  { number: '072', base: 'Terra Forge', price: '4.80', category: '3d-art', network: 'polygon', collection: 'Forge Works', attributes: ['Terracota', 'Bigorna', 'Calor'] },
  { number: '145', base: 'Midnight Lens', price: '0.67', category: 'photography', network: 'solana', collection: 'Nomad Society', attributes: ['Noite', 'Lente', 'Grão'] },
  { number: '264', base: 'Pixel Knight', price: '0.29', category: 'gaming', network: 'ethereum', collection: 'Pixel Pilots', attributes: ['Pixel', 'Armadura', 'Nível 3'] },
  { number: '011', base: 'Velvet Pass', price: '0.15', category: 'subscriptions', network: 'polygon', collection: 'Kurio Pass', attributes: ['Veludo', 'Mensal', 'Acesso'] },
  { number: '036', base: 'Ember Key', price: '0.25', category: 'utility', network: 'ethereum', collection: 'Kurio Keys', attributes: ['Brasa', 'Chave', 'Evento'] },
  { number: '099', base: 'Obsidian Ape', price: '5.60', oldPrice: '6.10', category: 'digital-art', network: 'ethereum', collection: 'Kurio Apes', rare: true, attributes: ['Obsidiana', 'Coroa', 'Raro'] },
  { number: '187', base: 'Quartz Totem', price: '2.05', category: '3d-art', network: 'solana', collection: 'Forge Works', attributes: ['Quartzo', 'Totem', 'Brilho'] },
  { number: '342', base: 'Saffron Drift', price: '1.05', category: 'generative', network: 'ethereum', collection: 'Cosmic Garden', attributes: ['Açafrão', 'Fluxo', 'Partículas'] },
  { number: '276', base: 'Desert Frame', price: '0.74', category: 'photography', network: 'polygon', collection: 'Nomad Society', attributes: ['Duna', 'Moldura', 'Meio-dia'] },
  { number: '508', base: 'Arcade Relic', price: '1.49', category: 'gaming', network: 'solana', collection: 'Pixel Pilots', attributes: ['Fliperama', 'Ficha', 'Retrô'] },
  { number: '024', base: 'Copper Pass', price: '0.09', category: 'subscriptions', network: 'ethereum', collection: 'Kurio Pass', attributes: ['Cobre', 'Anual', 'Acesso'] },
  { number: '053', base: 'Signal Key', price: '0.18', category: 'utility', network: 'solana', collection: 'Kurio Keys', attributes: ['Sinal', 'Chave', 'Discord'] },
  { number: '411', base: 'Ochre Titan', price: '7.25', category: 'collectibles', network: 'solana', collection: 'Baron Club', rare: true, attributes: ['Ocre', 'Titã', 'Raro'] },
  { number: '162', base: 'Sienna Wave', price: '0.88', category: 'generative', network: 'solana', collection: 'Cosmic Garden', attributes: ['Siena', 'Onda', 'Seno'] },
  { number: '219', base: 'Bronze Sculpt', price: '3.40', category: '3d-art', network: 'ethereum', collection: 'Forge Works', attributes: ['Bronze', 'Busto', 'Pátina'] },
  { number: '305', base: 'Mahogany Crest', price: '2.75', category: 'collectibles', network: 'polygon', collection: 'Baron Club', attributes: ['Mogno', 'Brasão', 'Heráldica'] },
  { number: '093', base: 'Tawny Racer', price: '0.55', category: 'gaming', network: 'polygon', collection: 'Pixel Pilots', attributes: ['Fulvo', 'Corrida', 'Nível 5'] },
  { number: '046', base: 'Maple Pass', price: '0.12', category: 'subscriptions', network: 'solana', collection: 'Kurio Pass', attributes: ['Bordo', 'Trimestral', 'Acesso'] },
  { number: '112', base: 'Cedar Club', price: '0.35', category: 'subscriptions', network: 'ethereum', collection: 'Kurio Pass', attributes: ['Cedro', 'Clube', 'VIP'] },
  { number: '077', base: 'Brass Key', price: '0.22', category: 'utility', network: 'polygon', collection: 'Kurio Keys', attributes: ['Latão', 'Chave', 'Airdrop'] },
  { number: '138', base: 'Clay Ticket', price: '0.06', category: 'utility', network: 'ethereum', collection: 'Kurio Keys', attributes: ['Argila', 'Ingresso', 'Show'] },
]

const creators = ['Nova Sato', 'Iris Moreau', 'Kenji Alves', 'Lua Fontes', 'Theo Brandt', 'Maya Okafor']
const editionLabels: Record<EditionId, string> = { '1-1': '1/1', '1-10': '1/10', '1-50': '1/50', open: 'ABERTA' }
const editionSupply: Record<EditionId, number | null> = { '1-1': 1, '1-10': 10, '1-50': 50, open: null }

/** Max units of an open edition per purchase. */
export const OPEN_EDITION_LIMIT = 99

// Deterministic availability: some editions sold out so "unavailable edition" is reachable.
function buildEditions(index: number): Edition[] {
  const soldOut1of1 = index % 3 === 1
  const available: Record<EditionId, number> = {
    '1-1': soldOut1of1 ? 0 : 1,
    '1-10': index % 7 === 3 ? 0 : 3 + (index % 7),
    '1-50': 20 + ((index * 7) % 30),
    open: OPEN_EDITION_LIMIT,
  }
  return (Object.keys(editionLabels) as EditionId[]).map((id) => ({
    id,
    label: editionLabels[id],
    supply: editionSupply[id],
    available: available[id],
  }))
}

export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Fixed reference date so fixtures are identical on every run.
const LISTED_BASE = Date.UTC(2026, 9, 20, 12, 0, 0)
const HOUR = 60 * 60 * 1000

export function buildNftFixtures(): NftRecord[] {
  return seeds.map((seed, index) => {
    const name = `${seed.base} #${seed.number}`
    return {
      id: toSlug(name),
      tokenId: `#${seed.number.padStart(4, '0')}`,
      name,
      description:
        `${name} é uma obra digital finalizada à mão da coleção ${seed.collection}. ` +
        'Cada atributo fica armazenado nos metadados do token e verificado na rede, com arte desbloqueável e acesso para colecionadores.',
      collection: seed.collection,
      category: seed.category,
      network: seed.network,
      creator: index === 0 ? 'Nova Sato' : creators[index % creators.length],
      imageFile: `${toSlug(seed.base)}.png`,
      price: seed.price,
      oldPrice: seed.oldPrice ?? null,
      rarity: seed.rare ? 'rare' : 'common',
      attributes: seed.attributes,
      rating: index === 0 ? 4.8 : Math.round((3.8 + ((index * 13) % 12) / 10) * 10) / 10,
      reviewsCount: index === 0 ? 19 : 4 + ((index * 11) % 40),
      listedAt: new Date(LISTED_BASE - index * 6 * HOUR).toISOString(),
      isNewRelease: index < 12,
      trendingScore: (index * 37) % 100,
      editions: buildEditions(index),
      version: 1,
    }
  })
}
