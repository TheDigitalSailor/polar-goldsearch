import { ArrowLeft, Clock, TrendingUp } from 'lucide-react'
import type { AnalysisSummary, VerdictType } from '../lib/types'
import { formatCurrency, formatPercent } from '../lib/financial'

interface Props {
  history: AnalysisSummary[]
  isLoading: boolean
  onBack: () => void
}

const verdictBadge: Record<
  VerdictType,
  { icon: string; label: string; className: string }
> = {
  excellent: { icon: '🚀', label: 'Excelente', className: 'text-indigo-400 bg-indigo-500/10' },
  investigate: { icon: '✅', label: 'Investigar', className: 'text-emerald-400 bg-emerald-500/10' },
  grey_zone: { icon: '⚠️', label: 'Zona cinzenta', className: 'text-amber-400 bg-amber-500/10' },
  pass: { icon: '❌', label: 'Passar', className: 'text-red-400 bg-red-500/10' },
}

export default function HistoryView({ history, isLoading, onBack }: Props) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2">
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h2 className="font-display text-2xl text-polar-cream">
          Histórico de análises
        </h2>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-polar-cream/40">A carregar...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-polar-cream/40">
          Ainda não há análises guardadas
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const badge = verdictBadge[item.verdict] ?? verdictBadge.pass
            return (
              <div
                key={item.id}
                className="card flex items-center justify-between gap-4 hover:border-white/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-polar-cream truncate">
                    {item.address}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-polar-cream/40">
                    <span>{item.typology} · {item.area} m²</span>
                    <span>{formatCurrency(item.askingPrice)}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(item.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm text-polar-cream/60">
                    <TrendingUp size={14} />
                    {formatPercent(item.netMargin)}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}
                  >
                    {badge.icon} {badge.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
