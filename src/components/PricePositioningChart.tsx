import type { Comparable, MarketStats } from '../lib/types'
import { formatCurrency } from '../lib/financial'

interface Props {
  askingPrice: number
  area: number
  marketStats: MarketStats
  comparables: Comparable[]
}

export default function PricePositioningChart({
  askingPrice,
  area,
  marketStats,
  comparables,
}: Props) {
  const askingPricePerSqm = askingPrice / area
  const { min, max, medianPricePerSqm } = marketStats

  // Position 0–100% on bar
  const range = max - min
  const safeRange = range || 1
  const position = Math.min(
    100,
    Math.max(0, ((askingPricePerSqm - min) / safeRange) * 100)
  )
  const medianPos = Math.min(
    100,
    Math.max(0, ((medianPricePerSqm - min) / safeRange) * 100)
  )

  const isBelow = askingPricePerSqm < medianPricePerSqm * 0.95
  const isAbove = askingPricePerSqm > medianPricePerSqm * 1.05

  const positionLabel = isBelow
    ? '↓ Abaixo do mercado'
    : isAbove
    ? '↑ Acima do mercado'
    : '≈ No mercado'

  const positionColor = isBelow
    ? 'text-verdict-investigate'
    : isAbove
    ? 'text-verdict-pass'
    : 'text-verdict-grey'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xl text-polar-cream">
          Posicionamento de preço
        </h3>
        <span className={`text-sm font-medium ${positionColor}`}>
          {positionLabel}
        </span>
      </div>

      {/* Bar */}
      <div className="relative mb-8">
        <div className="h-3 rounded-full bg-gradient-to-r from-verdict-investigate via-verdict-grey to-verdict-pass opacity-30" />
        <div className="h-3 rounded-full bg-gradient-to-r from-verdict-investigate via-verdict-grey to-verdict-pass absolute inset-0" />

        {/* Median marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${medianPos}%` }}
        >
          <div className="w-0.5 h-7 bg-white/40 -translate-y-2" />
          <div
            className="absolute -top-8 -translate-x-1/2 text-xs text-polar-cream/50 whitespace-nowrap"
            style={{ left: '50%' }}
          >
            Mediana
          </div>
        </div>

        {/* Property marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all"
          style={{ left: `${position}%` }}
        >
          <div className="w-5 h-5 rounded-full bg-polar-gold border-2 border-polar-purple shadow-lg shadow-polar-gold/30 -translate-y-1" />
          <div
            className="absolute top-5 -translate-x-1/2 text-xs font-semibold text-polar-gold whitespace-nowrap"
            style={{ left: '50%' }}
          >
            Este imóvel
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-10">
        <Stat label="Pedido / m²" value={formatCurrency(askingPricePerSqm)} />
        <Stat
          label="Mediana mercado / m²"
          value={formatCurrency(medianPricePerSqm)}
          highlight
        />
        <Stat
          label="Comparáveis"
          value={String(comparables.length)}
          suffix=" imóveis"
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string
  value: string
  suffix?: string
  highlight?: boolean
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-polar-cream/50 mb-1">{label}</div>
      <div
        className={`font-semibold text-lg ${highlight ? 'text-polar-gold' : 'text-polar-cream'}`}
      >
        {value}
        {suffix && <span className="text-sm font-normal">{suffix}</span>}
      </div>
    </div>
  )
}
