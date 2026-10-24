import { useId, useState } from 'react'
import {
  categoryIds,
  networkIds,
  type CategoryId,
  type NetworkId,
  type NftListResponse,
} from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { centiToEth, compareEth, ethToCenti, isEthString } from '@/lib/eth'
import { activeFilterCount, type CatalogSearch } from './search'

type Facets = NftListResponse['facets']

const categoryLabels: Record<CategoryId, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  subscriptions: 'Assinaturas',
  utility: 'Utilidade',
}
const networkLabels: Record<NetworkId, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

// The layout lists collections out of order; they are sorted alphabetically here.
const byLabel = <T extends string>(labels: Record<T, string>) => (a: T, b: T) => labels[a].localeCompare(labels[b], 'pt-BR')
const sortedCategories = [...categoryIds].sort(byLabel(categoryLabels))

function CheckboxGroup<T extends string>({
  legend,
  options,
  labels,
  counts,
  selected,
  onChange,
}: {
  legend: string
  options: readonly T[]
  labels: Record<T, string>
  counts: Record<T, number> | undefined
  selected: readonly T[] | undefined
  onChange: (next: T[]) => void
}) {
  const id = useId()
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 text-lg font-bold">{legend}</legend>
      {options.map((option) => {
        const checked = selected?.includes(option) ?? false
        const inputId = `${id}-${option}`
        return (
          <div key={option} className="flex items-center gap-3">
            <Checkbox
              id={inputId}
              checked={checked}
              onCheckedChange={(value) =>
                onChange(value === true ? [...(selected ?? []), option] : (selected ?? []).filter((item) => item !== option))
              }
            />
            <label
              htmlFor={inputId}
              className={`flex flex-1 cursor-pointer items-center justify-between gap-2 text-[15px] leading-10 ${checked ? 'text-highlight' : 'text-copy'}`}
            >
              <span>{labels[option]}</span>
              <span className="min-w-[2ch] text-right font-bold">{counts?.[option] ?? ''}</span>
            </label>
          </div>
        )
      })}
    </fieldset>
  )
}

function PriceFilter({
  range,
  minPrice,
  maxPrice,
  onApply,
}: {
  range: Facets['priceRange'] | undefined
  minPrice: string | undefined
  maxPrice: string | undefined
  onApply: (patch: Pick<CatalogSearch, 'minPrice' | 'maxPrice'>) => void
}) {
  const id = useId()
  const boundMin = range?.min ?? '0.00'
  const boundMax = range?.max ?? '0.00'
  const [min, setMin] = useState(minPrice ?? boundMin)
  const [max, setMax] = useState(maxPrice ?? boundMax)
  const [error, setError] = useState<string | null>(null)

  const lo = ethToCenti(boundMin)
  const hi = ethToCenti(boundMax)
  const toCenti = (value: string, fallback: number) => (isEthString(value) ? Math.min(hi, Math.max(lo, ethToCenti(value))) : fallback)

  const apply = () => {
    if (!isEthString(min) || !isEthString(max)) return setError('Use valores em ETH, como 0.50')
    if (compareEth(min, max) > 0) return setError('O mínimo não pode ser maior que o máximo')
    setError(null)
    onApply({
      minPrice: compareEth(min, boundMin) <= 0 ? undefined : min,
      maxPrice: compareEth(max, boundMax) >= 0 ? undefined : max,
    })
  }

  return (
    <fieldset className="grid gap-4">
      <legend className="mb-3 text-lg font-bold">Faixa de preço</legend>
      <Slider
        min={lo}
        max={hi}
        step={1}
        minStepsBetweenThumbs={0}
        value={[toCenti(min, lo), toCenti(max, hi)]}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        disabled={!range}
        onValueChange={([a, b]) => {
          setMin(centiToEth(a))
          setMax(centiToEth(b))
          setError(null)
        }}
      />
      <p className="text-[15px] text-copy">
        Preço: {min} - {max} ETH
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label htmlFor={`${id}-min`} className="text-xs text-copy">
            Mínimo (ETH)
          </label>
          <Input id={`${id}-min`} inputMode="decimal" disabled={!range} value={min} aria-invalid={error ? true : undefined} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label htmlFor={`${id}-max`} className="text-xs text-copy">
            Máximo (ETH)
          </label>
          <Input id={`${id}-max`} inputMode="decimal" disabled={!range} value={max} aria-invalid={error ? true : undefined} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button type="button" size="sm" className="w-fit" onClick={apply} disabled={!range}>
        Aplicar
      </Button>
    </fieldset>
  )
}

export function FiltersPanel({
  facets,
  search,
  onChange,
  onClear,
}: {
  facets: Facets | undefined
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  onClear: () => void
}) {
  const active = activeFilterCount(search) + (search.q ? 1 : 0)
  return (
    <div className="grid gap-10">
      <CheckboxGroup
        legend="Coleções"
        options={sortedCategories}
        labels={categoryLabels}
        counts={facets?.categories}
        selected={search.categories}
        onChange={(next) => onChange({ categories: next })}
      />
      <PriceFilter
        // Remount when the URL changes the range (back button, clear), so the draft follows it.
        key={`${search.minPrice}|${search.maxPrice}|${facets?.priceRange.min}|${facets?.priceRange.max}`}
        range={facets?.priceRange}
        minPrice={search.minPrice}
        maxPrice={search.maxPrice}
        onApply={onChange}
      />
      <CheckboxGroup
        legend="Rede"
        options={networkIds}
        labels={networkLabels}
        counts={facets?.networks}
        selected={search.networks}
        onChange={(next) => onChange({ networks: next })}
      />
      {active > 0 && (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onClear}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
