import { useEffect, useRef, useState } from 'react'
import { Radar as RadarIcon, RefreshCw, AlertCircle, Flame, Eye } from 'lucide-react'
import {
  getRadarListings, getLastRadarRun, runRadar, isRunStale,
  setListingStatus, markListingsSeen, recentPriceDropPct,
  type RadarListing, type RadarRun,
} from '../lib/radar'
import RadarCard from './RadarCard'

function sortForFeed(a: RadarListing, b: RadarListing): number {
  const pri = (l: RadarListing) => (recentPriceDropPct(l) !== null ? 0 : l.status === 'new' ? 1 : 2)
  const d = pri(a) - pri(b)
  return d !== 0 ? d : a.pricePerM2 - b.pricePerM2
}

export default function RadarView() {
  const [listings, setListings] = useState<RadarListing[]>([])
  const [lastRun, setLastRun] = useState<RadarRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)

  async function refresh() {
    const [list, run] = await Promise.all([getRadarListings(), getLastRadarRun()])
    setListings(list)
    setLastRun(run)
    // Mark freshly-found listings as seen for next visit (keep "Novo" badge this session)
    markListingsSeen(list.filter((l) => l.status === 'new').map((l) => l.id))
    return run
  }

  async function runNow() {
    setRunning(true)
    setError(null)
    try {
      const res = await runRadar()
      if (res.error) {
        setError(res.message || 'Não foi possível correr o radar neste momento.')
      } else {
        await refresh()
      }
    } catch {
      setError('Não foi possível correr o radar neste momento.')
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    ;(async () => {
      setLoading(true)
      try {
        const run = await refresh()
        if (isRunStale(run)) await runNow()
      } catch {
        setError('Não foi possível carregar o radar.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function toggleSave(l: RadarListing) {
    setListings((prev) => prev.filter((x) => x.id !== l.id)) // optimistic: leaves the feed
    try { await setListingStatus(l.id, 'saved') } catch { /* best-effort */ }
  }

  const strong = listings.filter((l) => l.tier === 'strong').sort(sortForFeed)
  const investigate = listings.filter((l) => l.tier === 'investigate').sort(sortForFeed)

  const lastRunLabel = lastRun
    ? new Date(lastRun.runAt).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-polar-ink">
            <RadarIcon size={22} className="text-polar-purple" /> Radar · Vila Franca de Xira
          </h2>
          <p className="text-sm text-polar-ink-muted mt-1">
            Scanner automático de oportunidades no Imovirtual · até {(400000).toLocaleString('pt-PT')} €
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {lastRun && <span className="hidden sm:block text-xs text-polar-ink-muted/60">Última: {lastRunLabel}</span>}
          <button
            onClick={runNow}
            disabled={running}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-polar-purple hover:bg-polar-purple-light rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={running ? 'animate-spin' : ''} />
            {running ? 'A correr…' : 'Correr radar agora'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-polar-ink-muted text-sm">A carregar o radar…</div>
      ) : listings.length === 0 && !error ? (
        <div className="text-center py-20 text-polar-ink-muted text-sm">
          Sem oportunidades de momento. Corre o radar para procurar.
        </div>
      ) : (
        <>
          <Section
            icon={<Flame size={15} className="text-emerald-600" />}
            title="Oportunidades fortes"
            sub="Abaixo da mediana de €/m² da zona"
            listings={strong}
            onToggleSave={toggleSave}
          />
          <Section
            icon={<Eye size={15} className="text-amber-600" />}
            title="Vale investigar"
            sub="Entre a mediana e +25%"
            listings={investigate}
            onToggleSave={toggleSave}
          />
        </>
      )}
    </div>
  )
}

function Section({ icon, title, sub, listings, onToggleSave }: {
  icon: React.ReactNode
  title: string
  sub: string
  listings: RadarListing[]
  onToggleSave: (l: RadarListing) => void
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-sm font-bold text-polar-ink">{title}</h3>
        <span className="text-xs text-polar-ink-muted/60">({listings.length})</span>
      </div>
      <p className="text-xs text-polar-ink-muted mb-4">{sub}</p>
      {listings.length === 0 ? (
        <p className="text-sm text-polar-ink-muted/60 py-4">Nenhuma listagem nesta categoria.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <RadarCard key={l.id} listing={l} saved={false} onToggleSave={onToggleSave} />
          ))}
        </div>
      )}
    </section>
  )
}
