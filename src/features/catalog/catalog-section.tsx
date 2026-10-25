import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { catalogSorts, catalogTabs } from '@/api/contracts'
import { Container } from '@/components/layout/container'
import { SEARCH_INPUT_ID } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { errorMessage } from '@/lib/form-errors'
import { useIsDesktop } from '@/lib/use-media-query'
import { FeaturedNft } from '../home/featured-nft'
import { FiltersPanel } from './filters-panel'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from './pagination'
import { nftListQueryOptions, toListQuery } from './queries'
import { activeFilterCount } from './search'
import { useCatalogSearch } from './use-catalog-search'

const tabLabels: Record<(typeof catalogTabs)[number], string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}
const sortLabels: Record<(typeof catalogSorts)[number], string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  popular: 'Mais populares',
}

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12 xl:gap-y-[72px] max-md:[&>*:nth-child(even)]:mt-6'

/** Search as you type: the URL is updated after a pause, or immediately on Enter. */
function CatalogSearchBox() {
  const isDesktop = useIsDesktop()
  const { search, update } = useCatalogSearch()
  const [value, setValue] = useState(search.q ?? '')
  const committed = useRef(search.q ?? '')

  // The URL changed from outside (back button, "clear filters"): follow it.
  useEffect(() => {
    if ((search.q ?? '') !== committed.current) {
      committed.current = search.q ?? ''
      setValue(committed.current)
    }
  }, [search.q])

  const commit = (text: string, replace: boolean) => {
    const next = text.trim()
    if (next === committed.current) return
    committed.current = next
    update({ q: next || undefined }, { replace })
  }

  useEffect(() => {
    const timer = setTimeout(() => commit(value, true), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <form role="search" className="relative flex-1" onSubmit={(event) => { event.preventDefault(); commit(value, false) }}>
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        Buscar NFTs
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={SEARCH_INPUT_ID}
        type="search"
        placeholder={isDesktop ? 'Buscar NFTs ou coleções' : 'Explorar coleções'}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-[45px] rounded-[10px] bg-card pl-12 font-bold md:rounded-md"
      />
    </form>
  )
}

/** Search box plus the filters sheet (opened by the button below 1280px). On mobile it sits above the hero. */
export function CatalogToolbar() {
  const { search, update, clear } = useCatalogSearch()
  const catalog = useQuery({ ...nftListQueryOptions(toListQuery(search)), placeholderData: keepPreviousData })
  const data = catalog.data
  const filterCount = activeFilterCount(search)
  const panel = <FiltersPanel facets={data?.facets} search={search} onChange={update} onClear={clear} />

  return (
    <div className="flex gap-3">
      <CatalogSearchBox />
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="pill"
            size="icon-lg"
            className="relative size-[45px] shrink-0 rounded-[14px] xl:hidden"
            aria-label={filterCount > 0 ? `Filtros (${filterCount} ativos)` : 'Filtros'}
          >
            <SlidersHorizontal className="size-5" />
            {filterCount > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                {filterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[340px] max-w-[90vw] overflow-y-auto bg-card">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>As alterações são aplicadas na hora.</SheetDescription>
          </SheetHeader>
          <div className="px-4">{panel}</div>
          <SheetFooter>
            <SheetClose asChild>
              <Button>{data ? `Ver ${data.total} ${data.total === 1 ? 'resultado' : 'resultados'}` : 'Ver resultados'}</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function CatalogSection() {
  const isDesktop = useIsDesktop()
  const { search, update, clear } = useCatalogSearch()
  const catalog = useQuery({
    ...nftListQueryOptions(toListQuery(search)),
    // Keep the previous results on screen while the next ones load.
    placeholderData: keepPreviousData,
  })
  const data = catalog.data
  const filterCount = activeFilterCount(search)
  const tab = search.tab ?? 'all'

  // A stale URL (page 9 of 4) goes back to the last real page.
  useEffect(() => {
    if (data && !catalog.isPlaceholderData && data.total > 0 && data.page > data.totalPages) {
      update({ page: data.totalPages > 1 ? data.totalPages : undefined }, { replace: true })
    }
  }, [data, catalog.isPlaceholderData, update])

  const panel = <FiltersPanel facets={data?.facets} search={search} onChange={update} onClear={clear} />

  return (
    <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-6">
      <Container className="grid gap-6 xl:grid-cols-[310px_1fr] xl:gap-12">
        <h2 id="catalog-title" className="sr-only">
          Catálogo de NFTs
        </h2>

        <aside aria-label="Filtros" className="hidden content-start gap-12 xl:grid">
          <div className="bg-card p-5">{panel}</div>
          <FeaturedNft />
        </aside>

        <div className="grid min-w-0 content-start gap-6">
          {isDesktop && <CatalogToolbar />}

          <Tabs value={tab} onValueChange={(value) => update({ tab: value === 'all' ? undefined : (value as typeof tab) })} className="min-w-0 gap-6">
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
              {/* The list is as tall as its triggers (the base `h-8` is smaller), so only a narrow screen scrolls, sideways. The
            vertical padding leaves room for the focus ring, which `overflow-y-hidden` would otherwise clip. */}
              <TabsList
                variant="line"
                // Chrome leaves a partly hidden focused tab clipped; bring it fully into view.
                onFocus={(event) => event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })}
                className="max-w-full justify-start gap-3 overflow-x-auto overflow-y-hidden scroll-px-1.5 py-1 md:gap-5 [scrollbar-width:none] group-data-horizontal/tabs:h-auto"
              >
                {catalogTabs.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {tabLabels[value]}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex items-center gap-2 text-[15px]">
                <span id="sort-label">Ordenar por:</span>
                <Select value={search.sort ?? 'recent'} onValueChange={(value) => update({ sort: value === 'recent' ? undefined : (value as typeof search.sort) })}>
                  <SelectTrigger aria-labelledby="sort-label" className="h-10 rounded-md border-0 bg-transparent text-[15px] text-highlight">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end">
                    {catalogSorts.map((value) => (
                      <SelectItem key={value} value={value}>
                        {sortLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p role="status" className="text-sm text-copy max-md:sr-only">
              {data ? `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}` : ' '}
              {catalog.isFetching && data ? ' · atualizando…' : ''}
            </p>

            <TabsContent value={tab} className="grid gap-12 text-base">
              {!data && catalog.isError && (
                <div role="alert" className="grid justify-items-start gap-3 bg-card p-6">
                  <p className="font-bold">Não foi possível carregar o catálogo.</p>
                  <p className="text-copy">{errorMessage(catalog.error)}</p>
                  <Button variant="outline" onClick={() => void catalog.refetch()}>
                    Tentar novamente
                  </Button>
                </div>
              )}

              {!data && !catalog.isError && (
                <div className={GRID} aria-busy="true" aria-label="Carregando NFTs">
                  {Array.from({ length: 9 }, (_, i) => (
                    <NftCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {data && data.items.length === 0 && (
                <div data-testid="empty-state" className="grid justify-items-start gap-3 bg-card p-6">
                  <p className="font-bold">Nenhum NFT encontrado.</p>
                  <p className="text-copy">Tente outros termos ou remova alguns filtros.</p>
                  {(filterCount > 0 || search.q || search.tab) && (
                    <Button variant="outline" onClick={clear}>
                      Limpar filtros
                    </Button>
                  )}
                  {data.page > 1 && data.total === 0 && (
                    <Link to="/" search={{}} className="underline">
                      Voltar ao início
                    </Link>
                  )}
                </div>
              )}

              {data && data.items.length > 0 && (
                <ul aria-label="NFTs" aria-busy={catalog.isPlaceholderData} className={`${GRID} transition-opacity ${catalog.isPlaceholderData ? 'opacity-60' : ''}`}>
                  {data.items.map((nft, index) => (
                    <li key={nft.id}>
                      <NftCard nft={nft} priority={index < 3 && data.page === 1} />
                    </li>
                  ))}
                </ul>
              )}

              {data && <Pagination page={data.page} totalPages={data.totalPages} />}
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </section>
  )
}
