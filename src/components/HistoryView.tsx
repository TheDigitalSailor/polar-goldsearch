import { useState } from 'react'
import { ArrowLeft, Clock, TrendingUp, TrendingDown, History, Trash2, RefreshCw, Check, X, Pencil } from 'lucide-react'
import type { AnalysisSummary, VerdictType } from '../lib/types'
import { formatCurrency, formatPercent } from '../lib/financial'

interface Props {
  history: AnalysisSummary[]
  isLoading: boolean
  onBack: () => void
  onDelete: (id: string) => void
  onRerun: (item: AnalysisSummary) => void
  onOpen: (item: AnalysisSummary) => void
  onRename: (id: string, address: string) => void
}

type PendingAction =
  | { id: string; action: 'delete' | 'rerun' }
  | { id: string; action: 'rename'; value: string }

const verdictBadge: Record<VerdictType, { icon: string; label: string; className: string }> = {
  excellent:   { icon: '🚀', label: 'Excelente',   className: 'text-indigo-700 bg-indigo-100'  },
  investigate: { icon: '✅', label: 'Investigar',  className: 'text-emerald-700 bg-emerald-100' },
  grey_zone:   { icon: '⚠️', label: 'Zona cinz.', className: 'text-amber-700 bg-amber-100'    },
  pass:        { icon: '❌', label: 'Mau negócio', className: 'text-red-700 bg-red-100'        },
}

export default function HistoryView({ history, isLoading, onBack, onDelete, onRerun, onOpen, onRename }: Props) {
  const [pending, setPending] = useState<PendingAction | null>(null)

  function requestAction(id: string, action: 'delete' | 'rerun') {
    setPending({ id, action })
  }

  function requestRename(item: AnalysisSummary) {
    setPending({ id: item.id, action: 'rename', value: item.address })
  }

  function confirmAction(item: AnalysisSummary) {
    if (!pending) return
    if (pending.action === 'delete') onDelete(item.id)
    else if (pending.action === 'rerun') onRerun(item)
    else if (pending.action === 'rename') onRename(item.id, pending.value)
    setPending(null)
  }

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
            const isPending = pending?.id === item.id

            return (
              <div
                key={item.id}
                onClick={() => !isPending && onOpen(item)}
                className="card group relative flex items-center justify-between gap-4 cursor-pointer hover:shadow-card-md transition-shadow overflow-hidden"
              >
                {/* Left: address + meta */}
                <div className="flex-1 min-w-0" onClick={(e) => isPending && e.stopPropagation()}>
                  {isPending && pending!.action === 'rename' ? (
                    <input
                      autoFocus
                      value={(pending as { action: 'rename'; value: string; id: string }).value}
                      onChange={(e) => setPending({ ...pending!, action: 'rename', value: e.target.value } as PendingAction)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmAction(item)
                        if (e.key === 'Escape') setPending(null)
                      }}
                      className="font-medium text-polar-ink text-sm w-full bg-transparent border-b border-polar-purple outline-none pb-0.5 mb-1"
                    />
                  ) : (
                    <div className="font-medium text-polar-ink text-sm truncate mb-1">
                      {item.address}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-polar-ink-muted">
                    <span>{item.typology} · {item.area} m²</span>
                    <span>{formatCurrency(item.askingPrice)}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(item.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                </div>

                {/* Right: margin + badge — always visible */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={`flex items-center gap-1 text-sm font-medium ${item.netMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.netMargin >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {formatPercent(item.netMargin)}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${badge.className}`}>
                    {badge.icon} {badge.label}
                  </span>
                </div>

                {/* Actions overlay — absolute, right side, fades in on hover */}
                <div
                  className={`absolute inset-y-0 right-0 flex items-center gap-1 pl-24 pr-3 rounded-r-xl bg-gradient-to-l from-white via-white to-transparent transition-opacity ${
                    isPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isPending ? (
                    <div className="flex items-center gap-1">
                      {pending!.action !== 'rename' && (
                        <span className={`text-xs font-medium ${pending!.action === 'delete' ? 'text-red-500' : 'text-polar-purple'}`}>
                          {pending!.action === 'delete' ? 'Eliminar?' : 'Correr?'}
                        </span>
                      )}
                      <button
                        onClick={() => confirmAction(item)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          pending!.action === 'delete'
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-polar-purple hover:bg-polar-sand'
                        }`}
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setPending(null)}
                        className="p-1.5 rounded-lg text-polar-ink-muted hover:bg-polar-sand transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => requestRename(item)}
                        title="Renomear"
                        className="p-1.5 rounded-lg text-polar-ink-muted hover:text-polar-purple hover:bg-polar-sand transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => requestAction(item.id, 'rerun')}
                        title="Correr de novo"
                        className="p-1.5 rounded-lg text-polar-ink-muted hover:text-polar-purple hover:bg-polar-sand transition-colors"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        onClick={() => requestAction(item.id, 'delete')}
                        title="Eliminar análise"
                        className="p-1.5 rounded-lg text-polar-ink-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
