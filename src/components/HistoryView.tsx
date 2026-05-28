import { ArrowLeft, Clock, TrendingUp } from 'lucide-react'
import type { AnalysisSummary, VerdictType } from '../lib/types'
import { formatCurrency, formatPercent } from '../lib/financial'

interface Props {
  history: AnalysisSummary[]
  isLoading: boolean
  onBack: () => void
}

const verdictBadge: Record<VerdictType, { icon: string; label: string; className: string }> = {
  excellent:   { icon: '🚀', label: 'Excelente',      className: 'text-indigo-700 bg-indigo-100'  },
  investigate: { icon: '✅', label: 'Investigar',     className: 'text-emerald-700 bg-emerald-100' },
  grey_zone:   { icon: '⚠️', label: 'Zona cinzenta', className: 'text-amber-700 bg-amber-100'    },
  pass:        { icon: '❌', label: 'Passar',         className: 'text-red-600 bg-red-100'        },
}

export default function HistoryView({ history, isLoading, onBack }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-7">
        <button onClick={onBack} className="btn-ghost flex items-center gap-2 text-sm">
          <ArrowLeft size={15} />
          Voltar
        </button>
        <h2 className="font-display text-2xl text-polar-ink">
          Histórico de análises
        </h2>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-polar-ink-muted">A carregar...</div>
      ) : history.length === 0 ? (
        <div className="card text-center py-16 text-polar-ink-muted">
          Ainda não há análises guardadas
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const badge = verdictBadge[item.verdict] ?? verdictBadge.pass
            return (
              <div
                key={item.id}
                className="card flex items-center justify-between gap-4 hover:shadow-card-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-polar-ink truncate">
                    {item.address}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-polar-ink-muted">
                    <span>{item.typology} · {item.area} m²</span>
                    <span>{formatCurrency(item.askingPrice)}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(item.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm text-polar-ink-muted font-medium">
                    <TrendingUp size={14} />
                    {formatPercent(item.netMargin)}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badge.className}`}>
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
