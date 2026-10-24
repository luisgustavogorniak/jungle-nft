// REST + realtime contracts shared by the app and the MSW handlers.
// Zod schemas are the single source of truth; TS types are inferred from them.
import { z } from 'zod'
import { isEthString } from '@/lib/eth'

export const ethAmount = z.string().refine(isEthString, 'Invalid ETH amount')

// ---------- Errors ----------

export const errorCodes = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'AVAILABILITY_CONFLICT',
  'QUOTE_CHANGED',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'IDEMPOTENCY_CONFLICT',
  'WALLET_REJECTED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const
export const errorCodeSchema = z.enum(errorCodes)
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

// ---------- Catalog ----------

export const categoryIds = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
] as const
export const categorySchema = z.enum(categoryIds)
export type CategoryId = z.infer<typeof categorySchema>

export const networkIds = ['ethereum', 'polygon', 'solana'] as const
export const networkSchema = z.enum(networkIds)
export type NetworkId = z.infer<typeof networkSchema>

export const editionIds = ['1-1', '1-10', '1-50', 'open'] as const
export const editionIdSchema = z.enum(editionIds)
export type EditionId = z.infer<typeof editionIdSchema>

export const editionSchema = z.object({
  id: editionIdSchema,
  label: z.string(), // "1/50", "ABERTA"
  supply: z.number().int().nullable(), // null = open edition
  available: z.number().int().nonnegative(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(), // "emerald-ape-042"
  tokenId: z.string(), // "#0042"
  name: z.string(),
  description: z.string(),
  collection: z.string(),
  category: categorySchema,
  network: networkSchema,
  creator: z.string(),
  image: z.string(), // 960 px artwork
  thumbnail: z.string(), // 480 px, cards and thumbnails
  price: ethAmount,
  oldPrice: ethAmount.nullable(),
  rarity: z.enum(['common', 'rare']),
  attributes: z.array(z.string()),
  rating: z.number(),
  reviewsCount: z.number().int(),
  listedAt: z.iso.datetime(),
  isNewRelease: z.boolean(),
  trendingScore: z.number(),
  editions: z.array(editionSchema),
  version: z.number().int(),
})
export type Nft = z.infer<typeof nftSchema>

export const catalogTabs = ['all', 'new', 'trending'] as const
export const catalogSorts = ['recent', 'price-asc', 'price-desc', 'popular'] as const

export const nftListQuerySchema = z.object({
  q: z.string().optional(),
  categories: z.array(categorySchema).optional(),
  networks: z.array(networkSchema).optional(),
  minPrice: ethAmount.optional(),
  maxPrice: ethAmount.optional(),
  tab: z.enum(catalogTabs).optional(),
  sort: z.enum(catalogSorts).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})
export type NftListQuery = z.infer<typeof nftListQuerySchema>

export const nftListResponseSchema = z.object({
  items: z.array(nftSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  facets: z.object({
    categories: z.record(categorySchema, z.number().int()),
    networks: z.record(networkSchema, z.number().int()),
    priceRange: z.object({ min: ethAmount, max: ethAmount }),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

// ---------- Session & account ----------

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  ensName: z.string().nullable(),
  walletNickname: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.email(),
  password: z.string().min(8),
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

export const updateProfileRequestSchema = userSchema
  .pick({ username: true, displayName: true, email: true, avatarUrl: true, ensName: true, walletNickname: true })
  .partial()
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

// ---------- Wallets ----------

export const walletProviders = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProviderSchema = z.enum(walletProviders)
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const walletInputSchema = z.object({
  displayName: z.string().min(1),
  nickname: z.string().min(1),
  network: networkSchema,
  profileName: z.string().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  secondaryAddress: z.string().nullable(),
  provider: walletProviderSchema,
  referralCode: z.string().min(1),
  email: z.email(),
  ensName: z.string().min(1),
})
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletSchema = walletInputSchema.extend({
  id: z.string(),
  slot: z.enum(['primary', 'secondary']),
  updatedAt: z.iso.datetime(),
})
export type Wallet = z.infer<typeof walletSchema>

/** Simulated connection of a registered wallet through a provider, before paying. */
export const walletConnectionRequestSchema = z.object({ provider: walletProviderSchema, network: networkSchema })
export type WalletConnectionRequest = z.infer<typeof walletConnectionRequestSchema>

export const walletConnectionSchema = walletConnectionRequestSchema.extend({
  walletId: z.string(),
  connectedAt: z.iso.datetime(),
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

// ---------- Favorites ----------

export const favoritesSchema = z.object({ nftIds: z.array(z.string()) })
export type Favorites = z.infer<typeof favoritesSchema>

// ---------- Cart & quote ----------

export const cartItemSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
  // Joined from the current catalog state:
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  editionLabel: z.string(),
  unitPrice: ethAmount,
  available: z.number().int().nonnegative(),
  nftVersion: z.number().int(), // lets realtime events older than this cart be ignored
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  updatedAt: z.iso.datetime(),
})
export type Cart = z.infer<typeof cartSchema>

export const cartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
})
export type CartItemInput = z.infer<typeof cartItemInputSchema>

export const cartItemQuantitySchema = z.object({ quantity: z.number().int().positive() })

export const quoteRequestSchema = z.object({ couponCode: z.string().nullable() })
export type QuoteRequest = z.infer<typeof quoteRequestSchema>

export const quoteLineSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
  unitPrice: ethAmount,
  lineTotal: ethAmount,
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteIssueSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  kind: z.enum(['price_changed', 'insufficient_availability', 'unavailable']),
  message: z.string(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const quoteSchema = z.object({
  id: z.string(),
  lines: z.array(quoteLineSchema),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  coupon: z.object({ code: z.string(), percentOff: z.number() }).nullable(),
  issues: z.array(quoteIssueSchema),
  expiresAt: z.iso.datetime(),
})
export type Quote = z.infer<typeof quoteSchema>

// ---------- Orders ----------

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const collectorSchema = z.object({
  displayName: z.string().min(1),
  username: z.string().min(1),
  email: z.email(),
  note: z.string().nullable(),
})
export type Collector = z.infer<typeof collectorSchema>

/** Sent with the `Idempotency-Key` header. */
export const createOrderRequestSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network: networkSchema,
  provider: walletProviderSchema,
  collector: collectorSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

export const orderLineSchema = quoteLineSchema.extend({
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  editionLabel: z.string(),
})
export type OrderLine = z.infer<typeof orderLineSchema>

/** Snapshot taken at creation: later catalog changes never alter it. */
export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  network: networkSchema,
  provider: walletProviderSchema,
  walletAddress: z.string(),
  lines: z.array(orderLineSchema),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  couponCode: z.string().nullable(),
  txHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  declineReason: z.string().nullable(),
})
export type Order = z.infer<typeof orderSchema>

// ---------- Realtime events ----------

const eventEnvelope = {
  eventId: z.string(), // stable identity, used for dedupe
  resourceId: z.string(),
  version: z.number().int(), // monotonic per resource, stale events are ignored
  occurredAt: z.iso.datetime(),
}

export const nftUpdatedEventSchema = z.object({
  ...eventEnvelope,
  type: z.literal('nft.updated'),
  data: z.object({
    price: ethAmount,
    oldPrice: ethAmount.nullable(),
    editions: z.array(editionSchema.pick({ id: true, available: true })),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  ...eventEnvelope,
  type: z.literal('order.updated'),
  data: orderSchema.pick({ status: true, txHash: true, explorerUrl: true, declineReason: true }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
