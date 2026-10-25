/**
 * Page numbers to show: every page when there are up to 5 (a gap would hide
 * only one or two), otherwise first, last and a window around the current page.
 */
export function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? ['gap' as const, n] : [n]))
}
