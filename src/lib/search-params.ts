// Router search params as plain query strings instead of TanStack's default
// JSON encoding: `?categories=music&categories=photography&sort=price-asc`
// is readable, shareable and what an API would expect. Repeated keys become
// arrays; every value is validated by the route's `validateSearch`.

export function parseSearch(searchString: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  for (const [key, value] of new URLSearchParams(searchString)) {
    const current = result[key]
    if (current === undefined) result[key] = value
    else result[key] = Array.isArray(current) ? [...current, value] : [current, value]
  }
  return result
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null || item === '') continue
      params.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item))
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}
