import { useState } from 'react'
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { recentPriceDropPct, type RadarListing } from '../lib/radar'

export interface FilterState {
  priceRange: [number, number]
  pricePerM2Range: [number, number]
  typologies: string[]
  tags: string[]
  domGroups: string[]
}

const PRICE_MAX = 400_000
const PPM2_MAX = 5_000

export const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, PRICE_MAX],
  pricePerM2Range: [0, PPM2_MAX],
  typologies: [],
  tags: [],
  domGroups: [],
}

const TYPOLOGY_PILLS = ['T1', 'T2', 'T3', 'T4', 'T5+', 'Outros']

const TAG_PILLS = [
  { id: 'forte',  label: 'Forte' },
  { id: 'novo',   label: 'Novo' },
  { id: 'baixa',  label: 'Baixa de preço' },
  { id: 'fresco', label: 'Fresco' },
  { id: 'longa',  label: 'Longa duração' },
]

const DOM_GROUPS = [
  { id: 'recente', label: 'Recente (0–30 dias)' },
  { id: 'medio',   label: 'Médio (30–180 dias)' },
  { id: 'longa',   label: 'Longa duração (180+ dias)' },
]

function fmtPrice(v: number): string {
  return `€${v.toLocaleString('pt-PT')}`
}

function priceRangeLabel(lo: number, hi: number): string {
  if (lo === 0 && hi === PRICE_MAX) return 'Qualquer preço'
  if (lo === 0) return `até ${fmtPrice(hi)}`
  if (hi === PRICE_MAX) return `${fmtPrice(lo)}+`
  return `${fmtPrice(lo)} – ${fmtPrice(hi)}`
}

function ppm2RangeLabel(lo: number, hi: number): string {
  if (lo === 0 && hi === PPM2_MAX) return 'Qualquer €/m²'
  if (lo === 0) return `até €${hi.toLocaleString('pt-PT')}/m²`
  if (hi === PPM2_MAX) return `€${lo.toLocaleString('pt-PT')}/m²+`
  return `€${lo.toLocaleString('pt-PT')} – €${hi.toLocaleString('pt-PT')}/m²`
}

function RangeSlider({ min, max, step, value, onChange }: {
  min: number; max: number; step: number
  value: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const [lo, hi] = value
  const loPercent = ((lo - min) / (max - min)) * 100
  const hiPercent = ((hi - min) / (max - min)) * 100

  // Both the inputs and the track are centred at top:50% so the thumb
  // (which overflows the 4px input) is always symmetrically centred.
  const centred: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    left: 0, width: '100%',
  }

  return (
    <div style={{ position: 'relative', height: 24 }}>
      {/* Visual track */}
      <div style={{ ...centred, height: 4, borderRadius: 9999, background: 'var(--polar-line)', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', height: '100%', borderRadius: 9999,
          left: `${loPercent}%`, right: `${100 - hiPercent}%`,
          background: 'var(--polar-purple)',
        }} />
      </div>
      {/* Lo thumb — input is 4px tall so the 16px thumb overflows it symmetrically */}
      <input
        type="range" min={min} max={max} step={step} value={lo}
        onChange={e => onChange([Math.min(Number(e.target.value), hi - step), hi])}
        className="range-slider-input"
        style={{ ...centred, height: 4, zIndex: lo >= hi - step ? 5 : 3 }}
      />
      {/* Hi thumb */}
      <input
        type="range" min={min} max={max} step={step} value={hi}
        onChange={e => onChange([lo, Math.max(Number(e.target.value), lo + step)])}
        className="range-slider-input"
        style={{ ...centred, height: 4, zIndex: 4 }}
      />
    </div>
  )
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

export function activeFilterCount(f: FilterState): number {
  let n = 0
  if (f.priceRange[0] !== 0 || f.priceRange[1] !== PRICE_MAX) n++
  if (f.pricePerM2Range[0] !== 0 || f.pricePerM2Range[1] !== PPM2_MAX) n++
  if (f.typologies.length > 0) n++
  if (f.tags.length > 0) n++
  if (f.domGroups.length > 0) n++
  return n
}

export function matchTypology(typ: string, pill: string): boolean {
  const t = typ.trim().toUpperCase()
  if (pill === 'T1') return t === 'T1'
  if (pill === 'T2') return t === 'T2'
  if (pill === 'T3') return t === 'T3'
  if (pill === 'T4') return t === 'T4'
  if (pill === 'T5+') return /^T[5-9]$/.test(t) || /^T\d{2,}$/.test(t)
  if (pill === 'Outros') return !/^T\d+$/.test(t)
  return false
}

export function applyFilters(listings: RadarListing[], f: FilterState): RadarListing[] {
  return listings.filter(l => {
    if (l.price < f.priceRange[0] || l.price > f.priceRange[1]) return false
    if (l.pricePerM2 < f.pricePerM2Range[0] || l.pricePerM2 > f.pricePerM2Range[1]) return false
    if (f.typologies.length > 0 && !f.typologies.some(p => matchTypology(l.typology, p))) return false
    if (f.tags.length > 0) {
      const ok = f.tags.some(tag => {
        if (tag === 'forte')  return l.tier === 'strong'
        if (tag === 'novo')   return l.status === 'new'
        if (tag === 'baixa')  return recentPriceDropPct(l) !== null
        if (tag === 'fresco') return l.daysOnMarket < 7
        if (tag === 'longa')  return l.daysOnMarket > 180
        return false
      })
      if (!ok) return false
    }
    if (f.domGroups.length > 0) {
      const ok = f.domGroups.some(g => {
        if (g === 'recente') return l.daysOnMarket <= 30
        if (g === 'medio')   return l.daysOnMarket > 30 && l.daysOnMarket <= 180
        if (g === 'longa')   return l.daysOnMarket > 180
        return false
      })
      if (!ok) return false
    }
    return true
  })
}

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
  totalVisible: number
}

export default function RadarFilters({ filters: f, onChange, totalVisible }: Props) {
  const [open, setOpen] = useState(false)
  const count = activeFilterCount(f)
  const hasFilters = count > 0

  function set(partial: Partial<FilterState>) {
    onChange({ ...f, ...partial })
  }

  const pillBase = 'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border'
  const pillActive = 'bg-polar-purple border-polar-purple text-white'
  const pillInactive = 'bg-polar-sand border-polar-line text-polar-ink-muted hover:bg-polar-sand-dark'

  return (
    <div className="card !p-0 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-polar-ink"
        >
          <SlidersHorizontal size={15} className="text-polar-ink-muted" />
          {hasFilters ? `Filtros (${count})` : 'Filtros'}
          {open
            ? <ChevronUp size={14} className="text-polar-ink-muted" />
            : <ChevronDown size={14} className="text-polar-ink-muted" />}
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-polar-ink-muted whitespace-nowrap">
            {totalVisible} imóveis encontrados
          </span>
          {hasFilters && (
            <button
              onClick={() => onChange({ ...DEFAULT_FILTERS })}
              className="text-xs text-polar-purple hover:underline font-medium whitespace-nowrap"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Expandable panel */}
      {open && (
        <div className="border-t border-polar-line px-4 py-4 space-y-5">

          {/* Price range */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-polar-ink">Preço</span>
              <span className="text-xs text-polar-ink-muted">{priceRangeLabel(f.priceRange[0], f.priceRange[1])}</span>
            </div>
            <RangeSlider
              min={0} max={PRICE_MAX} step={5_000}
              value={f.priceRange}
              onChange={v => set({ priceRange: v })}
            />
          </div>

          {/* Price per m² */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-polar-ink">Preço/m²</span>
              <span className="text-xs text-polar-ink-muted">{ppm2RangeLabel(f.pricePerM2Range[0], f.pricePerM2Range[1])}</span>
            </div>
            <RangeSlider
              min={0} max={PPM2_MAX} step={50}
              value={f.pricePerM2Range}
              onChange={v => set({ pricePerM2Range: v })}
            />
          </div>

          {/* Typology */}
          <div>
            <span className="text-xs font-semibold text-polar-ink block mb-2">Tipologia</span>
            <div className="flex flex-wrap gap-1.5">
              {TYPOLOGY_PILLS.map(pill => (
                <button
                  key={pill}
                  onClick={() => set({ typologies: toggle(f.typologies, pill) })}
                  className={`${pillBase} ${f.typologies.includes(pill) ? pillActive : pillInactive}`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <span className="text-xs font-semibold text-polar-ink block mb-2">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {TAG_PILLS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => set({ tags: toggle(f.tags, id) })}
                  className={`${pillBase} ${f.tags.includes(id) ? pillActive : pillInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Days on market */}
          <div>
            <span className="text-xs font-semibold text-polar-ink block mb-2">Tempo no mercado</span>
            <div className="flex flex-wrap gap-1.5">
              {DOM_GROUPS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => set({ domGroups: toggle(f.domGroups, id) })}
                  className={`${pillBase} ${f.domGroups.includes(id) ? pillActive : pillInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
