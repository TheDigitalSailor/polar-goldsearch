import { supabase } from './supabase'

export type RadarTier = 'strong' | 'investigate'
export type RadarStatus = 'new' | 'seen' | 'saved' | 'discarded'

export interface PricePoint { price: number; date: string }

export interface RadarListing {
  id: string
  listingId: string
  title: string
  location: string
  price: number
  areaM2: number
  pricePerM2: number
  typology: string
  daysOnMarket: number
  url: string
  firstSeen: string
  lastSeen: string
  status: RadarStatus
  tier: RadarTier
  priceHistory: PricePoint[]
}

export interface RadarRun {
  id: string
  runAt: string
  listingsFound: number
  newListings: number
  priceDrops: number
  zone: string
}

export interface RadarRunResult {
  ok?: boolean
  error?: string
  message?: string
  listingsFound?: number
  newListings?: number
  priceDrops?: number
  runAt?: string
}

const STALE_MS = 6 * 60 * 60 * 1000 // auto-run if last run older than 6h

// deno-lint-ignore no-explicit-any
function mapRow(r: any): RadarListing {
  return {
    id: r.id,
    listingId: r.listing_id,
    title: r.title ?? '',
    location: r.location ?? '',
    price: Number(r.price ?? 0),
    areaM2: Number(r.area_m2 ?? 0),
    pricePerM2: Number(r.price_per_m2 ?? 0),
    typology: r.typology ?? '—',
    daysOnMarket: Number(r.days_on_market ?? 0),
    url: r.url ?? '',
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
    status: r.status,
    tier: r.tier,
    priceHistory: Array.isArray(r.price_history) ? r.price_history : [],
  }
}

/** Most recent scraper run, or null if never run. */
export async function getLastRadarRun(): Promise<RadarRun | null> {
  const { data, error } = await supabase
    .from('radar_runs')
    .select('id, run_at, listings_found, new_listings, price_drops, zone')
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id,
    runAt: data.run_at,
    listingsFound: data.listings_found,
    newListings: data.new_listings,
    priceDrops: data.price_drops,
    zone: data.zone,
  }
}

export function isRunStale(run: RadarRun | null): boolean {
  if (!run) return true
  return Date.now() - new Date(run.runAt).getTime() > STALE_MS
}

/** Trigger a scraper run (server-side). */
export async function runRadar(): Promise<RadarRunResult> {
  const { data, error } = await supabase.functions.invoke('run-radar')
  if (error) return { error: error.message }
  return data as RadarRunResult
}

/** Active radar feed — strong + investigate, excluding saved/discarded. */
export async function getRadarListings(): Promise<RadarListing[]> {
  const { data, error } = await supabase
    .from('radar_listings')
    .select('*')
    .in('status', ['new', 'seen'])
    .order('price_per_m2', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function getSavedListings(): Promise<RadarListing[]> {
  const { data, error } = await supabase
    .from('radar_listings')
    .select('*')
    .eq('status', 'saved')
    .order('last_seen', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function setListingStatus(id: string, status: RadarStatus): Promise<void> {
  const { error } = await supabase.from('radar_listings').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Mark freshly-found listings as seen so they don't re-appear as "new" next visit. */
export async function markListingsSeen(ids: string[]): Promise<void> {
  if (!ids.length) return
  await supabase.from('radar_listings').update({ status: 'seen' }).in('id', ids).eq('status', 'new')
}

/** Percentage price drop if the latest price change happened within 7 days, else null. */
export function recentPriceDropPct(l: RadarListing): number | null {
  const h = l.priceHistory
  if (!Array.isArray(h) || h.length < 2) return null
  const last = h[h.length - 1]
  const prev = h[h.length - 2]
  const within7d = Date.now() - new Date(last.date).getTime() < 7 * 24 * 60 * 60 * 1000
  if (within7d && last.price < prev.price && prev.price > 0) {
    return Math.round(((prev.price - last.price) / prev.price) * 100)
  }
  return null
}
