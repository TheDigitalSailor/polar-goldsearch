import { ArrowLeft, Clock, TrendingUp, TrendingDown, History } from 'lucide-react'
import type { AnalysisSummary, VerdictType } from '../lib/types'
import { formatCurrency, formatPercent } from '../lib/financial'

interface Props {
  history: AnalysisSummary[]
  isLoading: boolean
  onBack: () => void
}

const verdictBadge: Record<VerdictType, { icon: string; label: string; className: string }> = {
  excellent:   { icon: '🚀', label: 'Excelente',   className: 'text-indigo-700 bg-indigo-100'  },
  investigate: { icon: '✅', label: 'Investigar',  className: 'text-emerald-700 bg-emerald-100' },
  grey_zone:   { icon: '⚠️', label: 'Zona cinz.', className: 'text-amber-700 bg-amber-100'    },
  pass:        { icon: '❌', label: 'Mau negócio', className: 'text-red-700 bg-red-100'        },
}

export default function HistoryView({ history, isLoading, onBack }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Page header */}
      <div className="mb-8">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-polar-ink-muted hover:text-polar-ink transition-colors mb-5">
          <ArrowLeft size={14} /> Nova análise
        </button>
        <div className="flex items-center gap-2.5">
          <History size={18} className="text-polar-ink-muted" />
          <h2 className="text-xl font-semibold text-polar-ink">Histórico de análises</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-polar-ink-muted text-sm">A carregar...</div>
      ) : history.length === 0 ? (
        <div className="card text-center py-16 text-polar-ink-muted text-sm">
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
                  <div className="font-medium text-polar-ink text-sm truncate mb-1">
                    {item.address}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-polar-ink-muted">
                    <span>{item.typology} · {item.area} m²</span>
                    <span>{formatCurrency(item.askingPrice)}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(item.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={`flex items-center gap-1 text-sm font-medium ${item.netMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.netMargin >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {formatPercent(item.netMargin)}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${badge.className}`}>
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
