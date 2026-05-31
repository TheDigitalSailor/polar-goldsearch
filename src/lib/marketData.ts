import { supabase } from './supabase'

// ─── Types (shared with MarketTrendsView / PortugalMap) ─────────────────────────

export interface RegionData {
  code: string
  name: string
  group: string
  median: number
  medianNew: number
  medianExisting: number
  yoy: number | null
}

export interface TrendPoint {
  quarter: string
  code: string
  median: number
  medianNew: number
  medianExisting: number
}

export interface MarketData {
  updatedAt: string
  latestPeriod: string
  national: RegionData
  regions: RegionData[]
  trend: TrendPoint[]
}

// ─── Local cache ────────────────────────────────────────────────────────────
// INE data is quarterly, so it's pointless to refetch on every tab visit. We
// cache in memory (survives tab switches) and in localStorage (survives reloads),
// and only hit the network when the cache is empty, stale, or a manual refresh
// is requested.

const STORAGE_KEY = 'goldsearch.marketData.v1'
const TTL_MS = 24 * 60 * 60 * 1000 // 24h

interface Cached { data: MarketData; ts: number }

let memory: Cached | null = null
let inflight: Promise<MarketData> | null = null

function readStorage(): Cached | null {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    if (!parsed?.data?.regions) return null
    memory = parsed
    return parsed
  } catch {
    return null
  }
}

function writeStorage(data: MarketData) {
  memory = { data, ts: Date.now() }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)) } catch { /* quota / private mode */ }
}

/** Synchronously return cached data if present (for instant first render). */
export function getCachedMarketData(): MarketData | null {
  return readStorage()?.data ?? null
}

function isStale(): boolean {
  const c = readStorage()
  return !c || Date.now() - c.ts > TTL_MS
}

async function fetchFresh(): Promise<MarketData> {
  const { data, error } = await supabase.functions.invoke('market-data')
  if (error) throw new Error(error.message)
  const md = data as MarketData
  writeStorage(md)
  return md
}

/**
 * Resolve market data, preferring the cache. Pass `force` to bypass it.
 * Concurrent callers share a single in-flight request.
 */
export function loadMarketData(force = false): Promise<MarketData> {
  if (!force) {
    const cached = getCachedMarketData()
    if (cached && !isStale()) return Promise.resolve(cached)
  }
  if (inflight) return inflight
  inflight = fetchFresh().finally(() => { inflight = null })
  return inflight
}

/** Fire-and-forget warm-up, called once when the app opens. */
export function prefetchMarketData(): void {
  loadMarketData().catch(() => { /* surfaced later in the view */ })
}
