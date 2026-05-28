import type { VerdictType } from '../lib/types'
import { formatPercent } from '../lib/financial'

interface Props {
  verdict: VerdictType
  netMargin: number
  aiAnalysis: string
}

const verdictConfig: Record<
  VerdictType,
  { icon: string; label: string; color: string; bg: string; border: string }
> = {
  excellent: {
    icon: '🚀',
    label: 'Excelente — Prioridade máxima',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
  },
  investigate: {
    icon: '✅',
    label: 'Investigar — Bom negócio potencial',
    color: 'text-verdict-investigate',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  grey_zone: {
    icon: '⚠️',
    label: 'Zona cinzenta — Depende do risco de obra',
    color: 'text-verdict-grey',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  pass: {
    icon: '❌',
    label: 'Passar — Risco não compensa',
    color: 'text-verdict-pass',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
}

export default function VerdictCard({ verdict, netMargin, aiAnalysis }: Props) {
  const config = verdictConfig[verdict]

  return (
    <div className={`card border-2 ${config.border} ${config.bg}`}>
      <div className="flex items-start gap-4 mb-4">
        <span className="text-4xl">{config.icon}</span>
        <div>
          <div className={`font-display text-2xl ${config.color} leading-tight`}>
            {config.label}
          </div>
          <div className="text-polar-cream/50 text-sm mt-1">
            Margem líquida estimada: {' '}
            <span className={`font-semibold ${config.color}`}>
              {formatPercent(netMargin)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="text-xs text-polar-gold/60 uppercase tracking-wider mb-2">
          Análise IA
        </div>
        <p className="text-polar-cream/80 text-sm leading-relaxed whitespace-pre-wrap">
          {aiAnalysis}
        </p>
      </div>
    </div>
  )
}
