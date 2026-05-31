import { Heart, MapPin, Ruler, Clock, ExternalLink, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../lib/financial'
import { recentPriceDropPct, type RadarListing } from '../lib/radar'

interface Props {
  listing: RadarListing
  saved: boolean
  onToggleSave: (listing: RadarListing) => void
}

export default function RadarCard({ listing, saved, onToggleSave }: Props) {
  const drop = recentPriceDropPct(listing)
  const isNew = listing.status === 'new'

  return (
    <div className="card flex flex-col gap-3 relative">
      {/* Save button */}
      <button
        onClick={() => onToggleSave(listing)}
        title={saved ? 'Remover dos guardados' : 'Guardar'}
        className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
          saved ? 'bg-red-50 text-red-500' : 'bg-polar-bg text-polar-ink-muted hover:text-red-500'
        }`}
      >
        <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
      </button>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap pr-10">
        {listing.tier === 'strong' ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">🔥 Forte</span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">👀 Investigar</span>
        )}
        {isNew && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Novo</span>
        )}
        {drop !== null && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
            <TrendingDown size={10} /> Baixou {drop}%
          </span>
        )}
      </div>

      {/* Title + location */}
      <div>
        <h4 className="text-sm font-semibold text-polar-ink leading-snug line-clamp-2">{listing.title}</h4>
        <p className="flex items-center gap-1 text-xs text-polar-ink-muted mt-1">
          <MapPin size={11} /> {listing.location}
        </p>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-polar-ink">{formatCurrency(listing.price)}</span>
        <span className="text-xs text-polar-ink-muted">{formatCurrency(listing.pricePerM2)}/m²</span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-polar-ink-muted border-t border-polar-line pt-2.5">
        <span className="font-medium text-polar-ink">{listing.typology}</span>
        <span className="flex items-center gap-1"><Ruler size={11} /> {listing.areaM2} m²</span>
        {listing.daysOnMarket > 0 && (
          <span className="flex items-center gap-1"><Clock size={11} /> {listing.daysOnMarket} dias</span>
        )}
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-polar-purple hover:underline font-medium"
        >
          Ver imóvel <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}
