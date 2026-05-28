import { useState } from 'react'
import { Search, MapPin, Home, Ruler, Tag, Wrench, Euro } from 'lucide-react'
import type { PropertyInput, Typology, Condition } from '../lib/types'

interface Props {
  onSubmit: (data: PropertyInput) => void
  isLoading: boolean
}

const typologies: Typology[] = ['T0', 'T1', 'T2', 'T3', 'T4+']

const conditions: { value: Condition; label: string; description: string }[] = [
  { value: 'bad', label: 'Mau estado', description: 'Requer obras estruturais' },
  { value: 'renovation', label: 'Remodelação necessária', description: 'Obras de fundo' },
  { value: 'good', label: 'Bom estado', description: 'Funcional, pequenas melhorias' },
  { value: 'renovated', label: 'Remodelado', description: 'Pronto a habitar' },
]

export default function AnalysisForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<PropertyInput>({
    address: '',
    typology: 'T2',
    area: 0,
    askingPrice: 0,
    condition: 'renovation',
    renovationCost: 0,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  function set<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-polar-cream mb-3 tracking-tight">
          GoldSearch
        </h1>
        <p className="text-polar-cream/60 font-body text-base">
          Análise de mercado imobiliário — Polar Investimentos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Address */}
        <div>
          <label className="label">
            <MapPin size={14} className="inline mr-1.5 opacity-60" />
            Morada do imóvel
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: Rua das Flores 42, 2.º Dto, Lisboa"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            required
          />
        </div>

        {/* Typology + Area */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">
              <Home size={14} className="inline mr-1.5 opacity-60" />
              Tipologia
            </label>
            <div className="flex gap-2">
              {typologies.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('typology', t)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    form.typology === t
                      ? 'bg-polar-gold text-polar-purple'
                      : 'bg-polar-purple-dark border border-white/20 text-polar-cream/70 hover:border-white/40'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">
              <Ruler size={14} className="inline mr-1.5 opacity-60" />
              Área (m²)
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="Ex: 85"
              min={10}
              max={1000}
              value={form.area || ''}
              onChange={(e) => set('area', Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* Asking price */}
        <div>
          <label className="label">
            <Tag size={14} className="inline mr-1.5 opacity-60" />
            Preço pedido (€)
          </label>
          <div className="relative">
            <Euro
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-polar-cream/30"
            />
            <input
              type="number"
              className="input-field pl-9"
              placeholder="Ex: 180000"
              min={0}
              value={form.askingPrice || ''}
              onChange={(e) => set('askingPrice', Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="label">
            <Home size={14} className="inline mr-1.5 opacity-60" />
            Condição do imóvel
          </label>
          <div className="grid grid-cols-2 gap-2">
            {conditions.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => set('condition', c.value)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  form.condition === c.value
                    ? 'bg-polar-gold/20 border-2 border-polar-gold text-polar-cream'
                    : 'bg-polar-purple-dark border-2 border-white/10 text-polar-cream/70 hover:border-white/30'
                }`}
              >
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs opacity-60 mt-0.5">{c.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Renovation cost */}
        <div>
          <label className="label">
            <Wrench size={14} className="inline mr-1.5 opacity-60" />
            Estimativa de obras (€)
          </label>
          <div className="relative">
            <Euro
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-polar-cream/30"
            />
            <input
              type="number"
              className="input-field pl-9"
              placeholder="Ex: 25000"
              min={0}
              value={form.renovationCost || ''}
              onChange={(e) => set('renovationCost', Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-polar-cream/40 mt-1.5">
            Deixar 0 se o imóvel não precisa de obras
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !form.address || !form.area || !form.askingPrice}
          className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
        >
          <Search size={18} />
          {isLoading ? 'A analisar...' : 'Analisar imóvel'}
        </button>
      </form>
    </div>
  )
}
