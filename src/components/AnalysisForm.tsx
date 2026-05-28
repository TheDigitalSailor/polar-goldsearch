import { useState, useEffect, useRef } from 'react'
import { Search, Euro, ArrowRight, ArrowLeft, MapPin, Loader2 } from 'lucide-react'
import type { PropertyInput, Typology, Condition } from '../lib/types'

interface Props {
  onSubmit: (data: PropertyInput) => void
  isLoading: boolean
}

const typologies: { value: Typology; rooms: string }[] = [
  { value: 'T0', rooms: 'Estúdio' },
  { value: 'T1', rooms: '1 quarto' },
  { value: 'T2', rooms: '2 quartos' },
  { value: 'T3', rooms: '3 quartos' },
  { value: 'T4+', rooms: '4+ quartos' },
]

const conditions: { value: Condition; label: string; sub: string }[] = [
  { value: 'bad',        label: 'O imóvel está em mau estado',   sub: 'Requer obras estruturais'     },
  { value: 'renovation', label: 'Precisa de remodelação',         sub: 'Obras de fundo necessárias'   },
  { value: 'good',       label: 'O imóvel está em bom estado',   sub: 'Apenas pequenas melhorias'    },
  { value: 'renovated',  label: 'O imóvel não precisa de obras', sub: 'Pronto a habitar ou arrendar' },
]

const STEPS = [
  { title: 'Onde fica o imóvel?',       sub: 'Introduz a morada para encontrarmos comparáveis na zona' },
  { title: 'Como é o imóvel?',          sub: 'Tipologia, área e condição actual' },
  { title: 'Qual o valor do negócio?',  sub: 'Preço pedido e estimativa de obras' },
]

// ── Nominatim address autocomplete ──────────────────────────────────────────
interface NominatimResult {
  display_name: string
  place_id: number
  address: {
    road?: string
    suburb?: string
    city?: string
    town?: string
    postcode?: string
  }
}

function useAddressAutocomplete(query: string) {
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 3) { setResults([]); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=pt&format=json&limit=6&addressdetails=1`
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-PT' } })
        const data: NominatimResult[] = await res.json()
        setResults(data.slice(0, 5))
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [query])

  return { results, loading }
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AnalysisForm({ onSubmit, isLoading }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<PropertyInput>({
    address: '', typology: 'T2', area: 0,
    askingPrice: 0, condition: 'renovation', renovationCost: 0,
  })

  const [addressInput, setAddressInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { results, loading } = useAddressAutocomplete(addressInput)
  const dropdownRef = useRef<HTMLDivElement>(null)

  function set<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setForm(p => ({ ...p, [key]: value }))
  }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function selectAddress(r: NominatimResult) {
    const parts = r.display_name.split(',').slice(0, 4).join(',').trim()
    set('address', parts)
    setAddressInput(parts)
    setShowDropdown(false)
  }

  function canNext() {
    if (step === 0) return form.address.length > 3
    if (step === 1) return form.area > 0
    return form.askingPrice > 0
  }

  function handleNext() {
    if (step < 2) setStep(s => s + 1)
    else onSubmit(form)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="font-display text-4xl text-polar-ink tracking-tight mb-2">
            {STEPS[step].title}
          </h1>
          <p className="text-polar-ink-muted text-sm">{STEPS[step].sub}</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-polar-line rounded-2xl p-6 mb-5 min-h-[240px] flex flex-col justify-center shadow-card-md">

          {/* ── Step 0: Address ── */}
          {step === 0 && (
            <div ref={dropdownRef} className="relative">
              <label className="label">Morada do imóvel</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-polar-gold" />
                {loading && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-polar-ink-muted animate-spin" />}
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Ex: Rua das Flores 42, Lisboa"
                  value={addressInput}
                  onChange={e => {
                    setAddressInput(e.target.value)
                    set('address', e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  autoFocus
                />
              </div>

              {/* Dropdown */}
              {showDropdown && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-polar-line rounded-xl overflow-hidden z-50 shadow-card-md">
                  {results.map(r => (
                    <button
                      key={r.place_id}
                      type="button"
                      onMouseDown={() => selectAddress(r)}
                      className="w-full text-left px-4 py-3 text-sm text-polar-ink hover:bg-polar-sand transition-colors border-b border-polar-line last:border-0 flex items-start gap-2.5"
                    >
                      <MapPin size={13} className="text-polar-gold mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2 leading-snug text-polar-ink-muted">
                        {r.display_name.split(',').slice(0, 5).join(', ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {addressInput.length > 2 && !loading && results.length === 0 && (
                <p className="text-xs text-polar-ink-muted mt-2 ml-1">
                  Nenhum resultado — continua a escrever ou usa a morada completa
                </p>
              )}
            </div>
          )}

          {/* ── Step 1: Typology + Area + Condition ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Typology */}
              <div>
                <label className="label">Tipologia</label>
                <div className="flex gap-2">
                  {typologies.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('typology', t.value)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        form.typology === t.value
                          ? 'bg-polar-gold text-polar-purple border border-polar-gold shadow-sm'
                          : 'bg-white text-polar-ink-muted border border-polar-line hover:border-polar-gold/50 hover:text-polar-ink'
                      }`}
                    >
                      {t.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area */}
              <div>
                <label className="label">Área útil (m²)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Ex: 85"
                  min={10}
                  autoFocus
                  value={form.area || ''}
                  onChange={e => set('area', Number(e.target.value))}
                />
              </div>

              {/* Condition */}
              <div>
                <label className="label">Condição actual</label>
                <div className="grid grid-cols-2 gap-2">
                  {conditions.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => set('condition', c.value)}
                      className={`p-3.5 rounded-xl text-left transition-all ${
                        form.condition === c.value
                          ? 'bg-polar-purple/10 border-2 border-polar-purple/40'
                          : 'bg-white border-2 border-polar-line hover:border-polar-line'
                      }`}
                    >
                      <div className={`text-sm font-semibold leading-snug ${
                        form.condition === c.value ? 'text-polar-purple' : 'text-polar-ink'
                      }`}>
                        {c.label}
                      </div>
                      <div className="text-xs text-polar-ink-muted mt-1">{c.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Price + Renovation ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="label">Preço pedido</label>
                <div className="relative">
                  <Euro size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-polar-gold" />
                  <input
                    type="number"
                    className="input-field pl-10 text-lg"
                    placeholder="180 000"
                    min={0}
                    autoFocus
                    value={form.askingPrice || ''}
                    onChange={e => set('askingPrice', Number(e.target.value))}
                  />
                </div>
                {form.askingPrice > 0 && form.area > 0 && (
                  <p className="text-xs text-polar-ink-muted mt-2 ml-1">
                    ≈ {Math.round(form.askingPrice / form.area).toLocaleString('pt-PT')} €/m²
                  </p>
                )}
              </div>

              <div>
                <label className="label">
                  Estimativa de obras
                  <span className="text-polar-ink-muted font-normal ml-1">(opcional)</span>
                </label>
                <div className="relative">
                  <Euro size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-polar-gold" />
                  <input
                    type="number"
                    className="input-field pl-10"
                    placeholder="0"
                    min={0}
                    value={form.renovationCost || ''}
                    onChange={e => set('renovationCost', Number(e.target.value))}
                  />
                </div>
                <p className="text-xs text-polar-ink-muted mt-2 ml-1">Deixar em branco se o imóvel não precisa de obras</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 h-2 bg-polar-gold'
                  : i < step
                  ? 'w-2 h-2 bg-polar-gold/50'
                  : 'w-2 h-2 bg-polar-line'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-polar-line text-polar-ink-muted hover:text-polar-ink hover:bg-polar-sand transition-all text-sm font-medium shadow-sm"
            >
              <ArrowLeft size={15} /> Voltar
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext() || isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-polar-gold text-polar-purple font-semibold hover:bg-polar-gold-light transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {step === 2 ? (
              <><Search size={15} /> Analisar imóvel</>
            ) : (
              <>Continuar <ArrowRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
