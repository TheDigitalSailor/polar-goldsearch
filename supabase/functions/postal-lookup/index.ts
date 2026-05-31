import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

// Resolves Portuguese postal codes (códigos postais) via geoapi.pt, server-side,
// so the API key stays secret and results are cached. geoapi.pt understands the
// XXXX-XXX format natively and returns locality / município / distrito + streets.
//
// Optional secret: GEOAPI_KEY (free at https://geoapi.pt/request-api-key) removes
// the free-tier rate limit. The function still works without it, just throttled.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Suggestion {
  place_id: number
  display_name: string
  address: {
    road?: string
    suburb?: string
    city?: string
    county?: string
    postcode?: string
  }
}

const cache = new Map<string, { at: number; data: Suggestion[] }>()
const TTL_MS = 1000 * 60 * 60 * 24 // 24h

function normalizeCp(raw: string): string {
  const s = (raw || '').trim()
  if (/^\d{4}-\d{3}$/.test(s)) return s
  return s.replace(/\D/g, '').slice(0, 4)
}

// deno-lint-ignore no-explicit-any
function toSuggestions(data: any, cp: string): Suggestion[] {
  const locality     = String(data?.Localidade || data?.['Designação Postal'] || '')
  const municipality = String(data?.Concelho   || data?.municipio             || '')
  const district     = String(data?.Distrito   || '')

  // Street names from partes[].Artéria (nicely cased), fallback to flat ruas[].
  // deno-lint-ignore no-explicit-any
  const partes: any[] = Array.isArray(data?.partes) ? data.partes : []
  const partesStreets = [...new Set(
    // deno-lint-ignore no-explicit-any
    partes.map((p: any) => {
      const direct = String(p?.['Artéria'] || p?.Arteria || '')
      if (direct) return direct
      const key = Object.keys(p ?? {}).find((k) => /art.ria/i.test(k))
      return key ? String(p[key] || '') : ''
    }).filter(Boolean),
  )] as string[]

  const ruas: string[] = Array.isArray(data?.ruas) ? (data.ruas as string[]).filter(Boolean) : []
  const streets = partesStreets.length > 0 ? partesStreets : ruas

  if (streets.length > 0) {
    return streets.slice(0, 6).map((street, i) => ({
      place_id: i,
      display_name: [street, locality, municipality, district].filter(Boolean).join(', '),
      address: { road: street, suburb: locality, city: municipality, county: district, postcode: cp },
    }))
  }

  if (locality) {
    return [{
      place_id: 0,
      display_name: [locality, municipality, district].filter(Boolean).join(', '),
      address: { suburb: locality, city: municipality, county: district, postcode: cp },
    }]
  }

  return []
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    let cpRaw = ''
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      cpRaw = String((body as Record<string, unknown>)?.cp ?? '')
    } else {
      cpRaw = new URL(req.url).searchParams.get('cp') ?? ''
    }

    const code = normalizeCp(cpRaw)
    if (!/^\d{4}(-\d{3})?$/.test(code)) return json({ results: [] })

    const cached = cache.get(code)
    if (cached && Date.now() - cached.at < TTL_MS) return json({ results: cached.data, cached: true })

    const key = Deno.env.get('GEOAPI_KEY')
    const url = `https://json.geoapi.pt/cp/${encodeURIComponent(code)}${key ? `?key=${encodeURIComponent(key)}` : ''}`

    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) {
      console.warn(`geoapi ${res.status} for ${code}`)
      return json({ results: [], error: `geoapi ${res.status}` })
    }

    const data = await res.json()
    const results = toSuggestions(data, code)
    cache.set(code, { at: Date.now(), data: results })
    return json({ results })
  } catch (err) {
    console.error('postal-lookup error:', err)
    return json({ results: [], error: err instanceof Error ? err.message : 'erro' })
  }
})
