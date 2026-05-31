import { useEffect, useState } from 'react'
import { Heart, AlertCircle } from 'lucide-react'
import { getSavedListings, setListingStatus, type RadarListing } from '../lib/radar'
import RadarCard from './RadarCard'

export default function SavedView() {
  const [listings, setListings] = useState<RadarListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setListings(await getSavedListings())
    } catch {
      setError('Não foi possível carregar os imóveis guardados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function unsave(l: RadarListing) {
    setListings((prev) => prev.filter((x) => x.id !== l.id)) // optimistic
    try { await setListingStatus(l.id, 'seen') } catch { /* best-effort */ }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-polar-ink">
          <Heart size={20} className="text-red-500" fill="currentColor" /> Imóveis guardados
        </h2>
        <p className="text-sm text-polar-ink-muted mt-1">Oportunidades que marcaste a partir do Radar</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-polar-ink-muted text-sm">A carregar…</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-polar-ink-muted text-sm">
          Ainda não guardaste nenhum imóvel. Carrega no ♥ de uma listagem no Radar.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <RadarCard key={l.id} listing={l} saved onToggleSave={unsave} />
          ))}
        </div>
      )}
    </div>
  )
}
