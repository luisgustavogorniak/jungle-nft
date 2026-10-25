import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { cleanSearch, parseCatalogSearch, type CatalogSearch } from './search'

/**
 * Catalog state lives in the URL. Any change resets pagination (page 1),
 * unless the patch sets `page` itself. Each change is a history entry, so the
 * back button restores the previous filters.
 */
export function useCatalogSearch() {
  // The router keeps unknown or invalid params next to the validated ones: sanitize again.
  // Not strict: the home also renders behind the auth modal, where the active route is /login or /register.
  const rawSearch = useSearch({ strict: false })
  const search = useMemo(() => parseCatalogSearch(rawSearch), [rawSearch])
  const navigate = useNavigate({ from: '/' })

  const update = useCallback(
    (patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) => {
      void navigate({
        search: (prev) => cleanSearch({ ...parseCatalogSearch(prev), page: undefined, ...patch }),
        replace: options.replace,
        resetScroll: false,
      })
    },
    [navigate],
  )

  const clear = useCallback(() => {
    void navigate({ search: {}, resetScroll: false })
  }, [navigate])

  return { search, update, clear }
}
