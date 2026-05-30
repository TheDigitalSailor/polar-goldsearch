import { useState, useEffect, useRef } from 'react'
import { Search, Euro, ArrowRight, ArrowLeft, MapPin, Loader2 } from 'lucide-react'
import type { PropertyInput, Typology, Condition } from '../lib/types'

interface Props {
  onSubmit: (data: PropertyInput) => void
  isLoading: boolean
}

const typologies: { value: Typology }[] = [
  { value: 'T0' },
  { value: 'T1' },
  { value: 'T2' },
  { value: 'T3' },
  { value: 'T4+' },
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
  { title: 'Comentários ou descrição',  sub: 'Informação adicional sobre o imóvel — ajuda a IA a ser mais precisa (opcional)' },
]

// ── Nominatim address autocomplete ──────────────────────────────────────────
interface NominatimResult {
  display_name: string
  place_id: number
  address: {
    road?: string; suburb?: string; city?: string; town?: string; postcode?: string
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
    askingPrice: 0, condition: 'renovation', renovationCost: 0, comments: '',
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
    if (step === 2) return form.askingPrice > 0
    return true // step 3 is optional
  }

  function handleNext() {
    if (step < 3) setStep(s => s + 1)
    else onSubmit(form)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">

        {/* Card */}
        <div className="bg-white border border-polar-line rounded-xl p-6 mb-5 flex flex-col shadow-card-md">

          {/* Title inside card, left-aligned */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-polar-ink tracking-tight mb-1">
              {STEPS[step].title}
            </h1>
            <p className="text-polar-ink-muted text-sm">{STEPS[step].sub}</p>
          </div>

          {/* ── Step 0: Address ── */}
          {step === 0 && (
            <div ref={dropdownRef} className="relative">
              <Field label="Morada do imóvel">
                <TextInput
                  icon={<MapPin size={16} />}
                  placeholder="Ex: Rua das Flores 42, Lisboa"
                  value={addressInput}
                  autoFocus
                  loading={loading}
                  onChange={v => {
                    setAddressInput(v)
                    set('address', v)
                    setShowDropdown(true)
                  }}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                />
              </Field>

              {/* Dropdown */}
              {showDropdown && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-polar-line rounded-lg overflow-hidden z-50 shadow-card-md">
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
                <p className="text-xs text-polar-ink-muted mt-2 ml-0.5">
                  Nenhum resultado — continua a escrever ou usa a morada completa
                </p>
              )}
            </div>
          )}

          {/* ── Step 1: Typology + Area + Condition ── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Typology */}
              <Field label="Tipologia">
                <div className="flex gap-2">
                  {typologies.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('typology', t.value)}
                      className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all border ${
                        form.typology === t.value
                          ? 'bg-polar-purple/10 text-polar-purple border-polar-purple/40'
                          : 'bg-white text-polar-ink-muted border-polar-line hover:border-polar-purple/25 hover:text-polar-ink'
                      }`}
                    >
                      {t.value}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Area */}
              <Field label="Área útil (m²)">
                <NumberInput
                  placeholder="Ex: 85"
                  value={form.area}
                  min={10}
                  autoFocus
                  onChange={v => set('area', v)}
                />
              </Field>

              {/* Condition */}
              <Field label="Condição actual">
              <div className="grid grid-cols-2 gap-2">
                  {conditions.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => set('condition', c.value)}
                      className={`p-3.5 rounded-lg text-left transition-all border ${
                        form.condition === c.value
                          ? 'bg-polar-purple/10 border-polar-purple/40'
                          : 'bg-white border-polar-line hover:border-polar-purple/25'
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
              </Field>
            </div>
          )}

          {/* ── Step 3: Comments ── */}
          {step === 3 && (
            <Field
              label="Comentários ou descrição"
              optional
              description="Descreve características relevantes do imóvel que possam influenciar o valor ou a decisão."
            >
              <TextareaInput
                placeholder="Ex: andar alto, vista de rio, condomínio fechado, problemas estruturais conhecidos…"
                value={form.comments ?? ''}
                onChange={v => set('comments', v)}
                maxLength={1000}
                autoFocus
              />
            </Field>
          )}

          {/* ── Step 2: Price + Renovation ── */}
          {step === 2 && (
            <div className="space-y-5">
              <Field
                label="Preço pedido"
                helper={form.askingPrice > 0 && form.area > 0
                  ? `≈ ${Math.round(form.askingPrice / form.area).toLocaleString('pt-PT')} €/m²`
                  : undefined}
              >
                <NumberInput
                  icon={<Euro size={15} />}
                  placeholder="180 000"
                  value={form.askingPrice}
                  min={0}
                  autoFocus
                  onChange={v => set('askingPrice', v)}
                />
              </Field>

              <Field
                label="Estimativa de obras"
                optional
                helper="Deixar em branco se o imóvel não precisa de obras"
              >
                <NumberInput
                  icon={<Euro size={15} />}
                  placeholder="0"
                  value={form.renovationCost}
                  min={0}
                  onChange={v => set('renovationCost', v)}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-5 h-2 bg-polar-purple' : 'w-2 h-2 bg-stone-300'
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
              className="btn-ghost flex-1 flex items-center justify-center gap-2 py-3 text-sm"
            >
              <ArrowLeft size={15} /> Voltar
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext() || isLoading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            {step === 3 ? (
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

// ── Form component system ────────────────────────────────────────────────────

/** Wraps a label, input slot, and optional helper text */
function Field({ label, optional, description, helper, children }: {
  label: string
  optional?: boolean
  description?: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">
        {label}
        {optional && (
          <span className="text-polar-ink-muted font-normal ml-1.5 text-xs">(opcional)</span>
        )}
      </label>
      {description && (
        <p className="text-xs text-polar-ink-muted mb-2 ml-0.5">{description}</p>
      )}
      {children}
      {helper && (
        <p className="text-xs text-polar-ink-muted mt-1.5 ml-0.5">{helper}</p>
      )}
    </div>
  )
}

/** Text input — with optional leading icon and loading spinner */
function TextInput({ icon, placeholder, value, onChange, onFocus, autoFocus, loading }: {
  icon?: React.ReactNode
  placeholder?: string
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
  autoFocus?: boolean
  loading?: boolean
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-polar-gold pointer-events-none">
          {icon}
        </span>
      )}
      {loading && (
        <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-polar-ink-muted animate-spin" />
      )}
      <input
        type="text"
        className={`input-field${icon ? ' pl-10' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        autoFocus={autoFocus}
      />
    </div>
  )
}

/** Textarea — free text, optional character counter */
function TextareaInput({ placeholder, value, onChange, maxLength, autoFocus }: {
  placeholder?: string
  value: string
  onChange: (v: string) => void
  maxLength?: number
  autoFocus?: boolean
}) {
  return (
    <div>
      <textarea
        className="textarea-field h-36 w-full"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        autoFocus={autoFocus}
      />
      {maxLength && (
        <p className="text-xs text-polar-ink-muted mt-1 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  )
}

/** Number input — with optional leading icon */
/** Format a number with spaces every 3 digits: 290000 → "290 000" */
function formatNumber(n: number): string {
  if (!n) return ''
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Strip spaces and parse back to number */
function parseFormatted(s: string): number {
  const clean = s.replace(/\s/g, '').replace(/[^\d]/g, '')
  return clean ? parseInt(clean, 10) : 0
}

function NumberInput({ icon, placeholder, value, onChange, autoFocus, min = 0 }: {
  icon?: React.ReactNode
  placeholder?: string
  value: number
  onChange: (v: number) => void
  autoFocus?: boolean
  min?: number
}) {
  const [display, setDisplay] = useState(formatNumber(value))

  // Keep display in sync when value changes from outside
  useEffect(() => {
    setDisplay(formatNumber(value))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    // Allow only digits and spaces
    const cleaned = raw.replace(/[^\d\s]/g, '')
    const num = parseFormatted(cleaned)
    setDisplay(formatNumber(num) || (cleaned.trim() === '' ? '' : cleaned))
    onChange(num)
  }

  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-polar-gold pointer-events-none">
          {icon}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        className={`input-field${icon ? ' pl-10' : ''}`}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        autoFocus={autoFocus}
        min={min}
      />
    </div>
  )
}
