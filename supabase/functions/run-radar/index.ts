import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Config ────────────────────────────────────────────────────────────────
const ZONE = 'Vila Franca de Xira'
const ZONE_PATH = 'lisboa/vila-franca-de-xira'   // Imovirtual concelho path (covers all sub-zones)
const MAX_PRICE = 400000
const PAGE_SIZE = 36
// Pages to scan per property category. Bounded so the run stays well within the
// function time budget given the polite inter-request delay.
const CATEGORIES: Array<{ cat: string; maxPages: number }> = [
  { cat: 'apartamento', maxPages: 6 },
  { cat: 'moradia', maxPages: 3 },
]
const REQUEST_DELAY_MS = 1500
const INVESTIGATE_CEILING = 1.25 // price/m² up to median × 1.25 is "investigate"; above → ignore

const IMOV_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.google.pt/',
}

const ROOMS_TO_TYPOLOGY: Record<string, string> = {
  ZERO: 'T0', ONE: 'T1', TWO: 'T2', THREE: 'T3', FOUR: 'T4',
  FIVE: 'T5', SIX: 'T6', SEVEN: 'T7', EIGHT: 'T8', NINE: 'T9', TEN: 'T10+', MORE: 'T10+',
}

// Dwelling sanity bounds — filters out land/farms/quintas (huge plot areas with
// tiny €/m²) and obvious data errors that would otherwise corrupt the median.
const MIN_AREA_M2 = 20
const MAX_AREA_M2 = 800
const MIN_PPM2 = 500
const MAX_PPM2 = 15000

interface ScrapedListing {
  listingId: string
  title: string
  location: string
  price: number
  areaM2: number
  pricePerM2: number
  typology: string
  daysOnMarket: number
  url: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function median(values: number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// deno-lint-ignore no-explicit-any
function parseItems(html: string): any[] | null {
  if (!html.includes('"searchAds"')) return null
  const scriptMatch = html.match(/<script[^>]*>\s*(\{"props":\{"pageProps":[\s\S]*?)\s*<\/script>/)
  if (!scriptMatch) return null
  try {
    const data = JSON.parse(scriptMatch[1])
    return data?.props?.pageProps?.data?.searchAds?.items ?? []
  } catch {
    return null
  }
}

// deno-lint-ignore no-explicit-any
function mapItem(item: any): ScrapedListing | null {
  const price = Number(item?.totalPrice?.value ?? 0)
  const areaM2 = Number(item?.areaInSquareMeters ?? 0)
  if (price <= 0 || price > MAX_PRICE) return null
  if (areaM2 < MIN_AREA_M2 || areaM2 > MAX_AREA_M2) return null // skip land / plots / errors

  const slug = String(item?.slug ?? '')
  const idToken = slug.match(/-(ID[A-Za-z0-9]+)$/)?.[1]
  const listingId = idToken ?? (item?.id != null ? `ID${item.id}` : slug)
  if (!listingId) return null

  const ppsmRaw = Number(item?.pricePerSquareMeter?.value ?? 0)
  const pricePerM2 = ppsmRaw > 0 ? Math.round(ppsmRaw) : Math.round(price / areaM2)
  if (pricePerM2 < MIN_PPM2 || pricePerM2 > MAX_PPM2) return null // implausible €/m²

  let daysOnMarket = 0
  const pubDate = item?.createdAtFirst ?? item?.dateCreated
  if (pubDate) {
    const t = new Date(String(pubDate)).getTime()
    if (Number.isFinite(t)) daysOnMarket = Math.max(0, Math.round((Date.now() - t) / 86400000))
  }

  return {
    listingId,
    title: String(item?.title ?? 'Imóvel'),
    location: String(item?.location?.address?.city?.name ?? item?.location?.address?.province?.name ?? ZONE),
    price,
    areaM2,
    pricePerM2,
    typology: ROOMS_TO_TYPOLOGY[String(item?.roomsNumber)] ?? '—',
    daysOnMarket,
    url: slug ? `https://www.imovirtual.com/pt/anuncio/${slug}` : 'https://www.imovirtual.com',
  }
}

async function scrape(): Promise<{ listings: Map<string, ScrapedListing>; blocked: boolean; requests: number }> {
  const listings = new Map<string, ScrapedListing>()
  let blocked = false
  let requests = 0
  let firstRequest = true

  for (const { cat, maxPages } of CATEGORIES) {
    for (let page = 1; page <= maxPages; page++) {
      if (!firstRequest) await sleep(REQUEST_DELAY_MS)
      firstRequest = false
      requests++

      const url = `https://www.imovirtual.com/pt/resultados/comprar/${cat}/${ZONE_PATH}?limit=${PAGE_SIZE}&priceMax=${MAX_PRICE}&page=${page}`
      try {
        const res = await fetch(url, { headers: IMOV_HEADERS, signal: AbortSignal.timeout(20000) })
        if (!res.ok) {
          console.warn(`Imovirtual ${res.status} for ${cat} p${page}`)
          if (res.status === 403 || res.status === 429) blocked = true
          break
        }
        const items = parseItems(await res.text())
        if (!items) { console.warn(`No searchAds for ${cat} p${page}`); break }
        if (items.length === 0) break

        for (const item of items) {
          const mapped = mapItem(item)
          if (mapped) listings.set(mapped.listingId, mapped)
        }
        // Last page reached when the page isn't full.
        if (items.length < PAGE_SIZE) break
      } catch (err) {
        console.warn(`Imovirtual fetch error ${cat} p${page}:`, err)
        break
      }
    }
  }

  // If we made requests but got nothing at all, Imovirtual likely blocked/changed.
  if (listings.size === 0 && requests > 0) blocked = true
  return { listings, blocked, requests }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase não configurado' }, 500)
    const db = createClient(supabaseUrl, serviceKey)

    // 1. Scrape
    const { listings, blocked } = await scrape()
    if (blocked || listings.size === 0) {
      return json({
        error: 'blocked',
        message: 'Não foi possível obter listagens do Imovirtual neste momento (pode estar a bloquear pedidos). Tenta novamente mais tarde.',
      }, 200)
    }

    const found = [...listings.values()]

    // 2. Zone median price/m² over everything found this run
    const zoneMedian = median(found.map((l) => l.pricePerM2).filter((v) => v > 0))

    // 3. Classify; keep only strong + investigate (ignore the expensive ones)
    const kept = found
      .map((l) => {
        let tier: 'strong' | 'investigate' | null = null
        if (l.pricePerM2 < zoneMedian) tier = 'strong'
        else if (l.pricePerM2 <= zoneMedian * INVESTIGATE_CEILING) tier = 'investigate'
        return { ...l, tier }
      })
      .filter((l): l is ScrapedListing & { tier: 'strong' | 'investigate' } => l.tier !== null)

    // 4. Reconcile with existing rows
    const ids = kept.map((l) => l.listingId)
    const { data: existingRows } = await db
      .from('radar_listings')
      .select('listing_id, price, price_history, status')
      .in('listing_id', ids)

    // deno-lint-ignore no-explicit-any
    const existing = new Map<string, any>((existingRows ?? []).map((r: any) => [r.listing_id, r]))
    const nowIso = new Date().toISOString()

    // deno-lint-ignore no-explicit-any
    const toInsert: any[] = []
    let newCount = 0
    let priceDrops = 0
    const updates: Promise<unknown>[] = []

    for (const l of kept) {
      const prev = existing.get(l.listingId)

      if (!prev) {
        newCount++
        toInsert.push({
          listing_id: l.listingId,
          title: l.title,
          location: l.location,
          price: l.price,
          area_m2: l.areaM2,
          price_per_m2: l.pricePerM2,
          typology: l.typology,
          days_on_market: l.daysOnMarket,
          url: l.url,
          first_seen: nowIso,
          last_seen: nowIso,
          status: 'new',
          tier: l.tier,
          price_history: [{ price: l.price, date: nowIso }],
        })
        continue
      }

      const prevPrice = Number(prev.price)
      const priceChanged = Number.isFinite(prevPrice) && prevPrice !== l.price

      if (priceChanged) {
        if (l.price < prevPrice) priceDrops++
        const history = Array.isArray(prev.price_history) ? prev.price_history : []
        history.push({ price: l.price, date: nowIso })
        updates.push(
          db.from('radar_listings').update({
            price: l.price,
            area_m2: l.areaM2,
            price_per_m2: l.pricePerM2,
            tier: l.tier,
            days_on_market: l.daysOnMarket,
            last_seen: nowIso,
            // A price change re-surfaces the listing (unless the user already saved/discarded it)
            status: prev.status === 'saved' || prev.status === 'discarded' ? prev.status : 'new',
            price_history: history,
          }).eq('listing_id', l.listingId),
        )
      } else {
        // Same price — just refresh metadata, do NOT bump back to 'new'
        updates.push(
          db.from('radar_listings').update({
            tier: l.tier,
            days_on_market: l.daysOnMarket,
            last_seen: nowIso,
          }).eq('listing_id', l.listingId),
        )
      }
    }

    if (toInsert.length) updates.push(Promise.resolve(db.from('radar_listings').insert(toInsert)))
    await Promise.all(updates)

    // 5. Log the run
    await db.from('radar_runs').insert({
      run_at: nowIso,
      listings_found: found.length,
      new_listings: newCount,
      price_drops: priceDrops,
      zone: ZONE,
    })

    return json({
      ok: true,
      zone: ZONE,
      listingsFound: found.length,
      kept: kept.length,
      newListings: newCount,
      priceDrops,
      zoneMedian,
      runAt: nowIso,
    })
  } catch (err) {
    console.error('run-radar error:', err)
    return json({ error: err instanceof Error ? err.message : 'erro interno' }, 500)
  }
})
