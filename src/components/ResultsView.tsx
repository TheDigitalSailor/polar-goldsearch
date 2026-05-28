import { ArrowLeft, Home, Ruler, Tag } from 'lucide-react'
import type { AnalysisResult } from '../lib/types'
import { formatCurrency } from '../lib/financial'
import VerdictCard from './VerdictCard'
import PricePositioningChart from './PricePositioningChart'
import FinancialBreakdown from './FinancialBreakdown'
import ComparableCard from './ComparableCard'

interface Props {
  result: AnalysisResult
  onBack: () => void
}

const conditionLabels: Record<string, string> = {
  bad: 'Mau estado',
  renovation: 'Remodelação necessária',
  good: 'Bom estado',
  renovated: 'Remodelado',
}

export default function ResultsView({ result, onBack }: Props) {
  const { property, comparables, marketStats, financial, verdict, aiAnalysis } = result

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="btn-ghost flex items-center gap-2 mt-0.5 flex-shrink-0"
        >
          <ArrowLeft size={16} />
          Nova análise
        </button>
        <div>
          <h2 className="font-display text-2xl text-polar-cream leading-tight">
            {property.address}
          </h2>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-polar-cream/50">
            <span className="flex items-center gap-1">
              <Home size={13} />
              {property.typology}
            </span>
            <span className="flex items-center gap-1">
              <Ruler size={13} />
              {property.area} m²
            </span>
            <span className="flex items-center gap-1">
              <Tag size={13} />
              {formatCurrency(property.askingPrice)}
            </span>
            <span className="text-polar-cream/30">·</span>
            <span>{conditionLabels[property.condition]}</span>
          </div>
        </div>
      </div>

      {/* Verdict — first thing the user sees */}
      <VerdictCard
        verdict={verdict}
        netMargin={financial.netMargin}
        aiAnalysis={aiAnalysis}
      />

      {/* Price positioning chart */}
      <PricePositioningChart
        askingPrice={property.askingPrice}
        area={property.area}
        marketStats={marketStats}
        comparables={comparables}
      />

      {/* Financial breakdown */}
      <FinancialBreakdown financial={financial} />

      {/* Comparables */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-polar-cream">
            Comparáveis activos
          </h3>
          <span className="text-xs text-polar-cream/40">
            {comparables.length} imóveis · máx. 18 meses no mercado
          </span>
        </div>

        {comparables.length === 0 ? (
          <p className="text-polar-cream/40 text-sm py-4 text-center">
            Não foram encontrados comparáveis na zona
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {comparables.map((c, i) => (
              <ComparableCard
                key={i}
                comparable={c}
                medianPricePerSqm={marketStats.medianPricePerSqm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
