import { z } from 'zod'
import {
  catalogSorts,
  catalogTabs,
  categorySchema,
  ethAmount,
  networkSchema,
  type NftListQuery,
} from '@/api/contracts'

/** A single value or a repeated key; invalid items are dropped instead of invalidating the whole list. */
function listOf<T extends z.ZodType>(item: T) {
  return z.preprocess(
    (value) => {
      if (value === undefined) return undefined
      const items = (Array.isArray(value) ? value : [value]).filter((entry) => item.safeParse(entry).success)
      return items.length > 0 ? [...new Set(items)] : undefined
    },
    z.array(item).optional(),
  )
}

const shape = {
  q: z.string().trim().min(1).max(80).optional(),
  categories: listOf(categorySchema),
  networks: listOf(networkSchema),
  minPrice: ethAmount.optional(),
  maxPrice: ethAmount.optional(),
  tab: z.enum(catalogTabs).optional(),
  sort: z.enum(catalogSorts).optional(),
  page: z.coerce.number().int().positive().optional(),
}

/** Catalog state that lives in the URL. It maps 1:1 to the API query (minus page size). */
export type CatalogSearch = Omit<NftListQuery, 'pageSize'>

/**
 * Validates `?…` params field by field, so a bad value (`page=abc`,
 * `categories=foo`) is ignored without discarding the valid ones.
 */
export function parseCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(shape) as Array<keyof typeof shape>) {
    const parsed = shape[key].safeParse(raw[key])
    if (parsed.success && parsed.data !== undefined) result[key] = parsed.data
  }
  return result as CatalogSearch
}

const EMPTY_VALUES = new Set<unknown>([undefined, null, ''])

/** Removes empty values so they never reach the URL or the query key. */
export function cleanSearch<T extends Record<string, unknown>>(search: T): T {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => !EMPTY_VALUES.has(value) && !(Array.isArray(value) && value.length === 0)),
  ) as T
}

export function activeFilterCount(search: CatalogSearch): number {
  return (
    (search.categories?.length ?? 0) +
    (search.networks?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0)
  )
}
