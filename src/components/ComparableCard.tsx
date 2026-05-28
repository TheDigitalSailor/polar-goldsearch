import { ExternalLink, Clock, Ruler } from 'lucide-react'
import type { Comparable } from '../lib/types'
import { formatCurrency } from '../lib/financial'

interface Props {
  comparable: Comparable
  medianPricePerSqm: number
}

export default function ComparableCard({ comparable, medianPricePerSqm }: Props) {
  const diff = ((comparable.pricePerSqm - medianPricePerSqm) / medianPricePerSqm) * 100
  const diffColor =
    diff < -5 ? 'text-verdict-investigate' : diff > 5 ? 'text-verdict-pass' : 'text-verdict-grey'
  const diffLabel = diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`

  return (
    <div className="bg-polar-purple-dark border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm text-polar-cream/80 line-clamp-2 flex-1">{comparable.title}</p>
        {comparable.url && (
          <a
            href={comparable.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-polar-cream/30 hover:text-polar-gold transition-colors flex-shrink-0"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="text-lg font-semibold text-polar-cream mb-3">
        {formatCurrency(comparable.price)}
      </div>

      <div className="flex items-center gap-4 text-xs text-polar-cream/50">
        <span className="flex items-center gap-1">
          <Ruler size={12} />
          {comparable.area} m²
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {comparable.daysOnMarket}d no mercado
        </span>
        <span className={`ml-auto font-medium ${diffColor}`}>
          {formatCurrency(comparable.pricePerSqm)}/m² ({diffLabel})
        </span>
      </div>
    </div>
  )
}
