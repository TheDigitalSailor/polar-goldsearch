import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Financial logic ─────────────────────────────────────────────────────────

function calculateIMT(price: number): number {
  if (price <= 97064) return price * 0.01
  if (price <= 132774) return price * 0.02
  if (price <= 181034) return price * 0.05
  if (price <= 301688) return price * 0.07
  if (price <= 578598) return price * 0.08
  return price * 0.06
}

function calculateFinancials(
  purchasePrice: number,
  renovationCost: number,
  estimatedSalePrice: number
) {
  const imt = calculateIMT(purchasePrice)
  const stampDuty = purchasePrice * 0.008
  const notaryFees = 700
  const totalAcquisitionCost = purchasePrice + imt + stampDuty + notaryFees + renovationCost

  const agencyCommission = estimatedSalePrice * 0.05
  const agencyVAT = agencyCommission * 0.23
  const energyCertificate = 300
  const capitalGain = estimatedSalePrice - totalAcquisitionCost
  const capitalGainsTax = capitalGain > 0 ? capitalGain * 0.5 * 0.28 : 0
  const totalSaleCosts = agencyCommission + agencyVAT + capitalGainsTax + energyCertificate

  const grossProfit = estimatedSalePrice - purchasePrice - renovationCost
  const netProfit = estimatedSalePrice - totalAcquisitionCost - totalSaleCosts
  const netMargin = (netProfit / totalAcquisitionCost) * 100

  return {
    purchasePrice,
    imt,
    stampDuty,
    notaryFees,
    renovationCost,
    totalAcquisitionCost,
    estimatedSalePrice,
    agencyCommission,
    agencyVAT,
    capitalGainsTax,
    energyCertificate,
    totalSaleCosts,
    grossProfit,
    netProfit,
    netMargin,
    roi: netMargin,
  }
}

function getVerdict(netMargin: number): string {
  if (netMargin < 15) return 'pass'
  if (netMargin < 20) return 'grey_zone'
  if (netMargin < 30) return 'investigate'
  return 'excellent'
}

// ─── Apify ───────────────────────────────────────────────────────────────────

interface Comparable {
  title: string
  price: number
  area: number
  pricePerSqm: number
  daysOnMarket: number
  url?: string
  location: string
  rooms?: string
}

async function fetchComparables(
  address: string,
  typology: string,
  area: number,
  apifyToken: string
): Promise<Comparable[]> {
  // Extract location keywords from address for Idealista search
  const locationParts = address.split(',').map((s) => s.trim())
  // Use last meaningful part (city/district) for search
  const location = locationParts.slice(-2).join(', ')

  // Rooms mapping
  const roomsMap: Record<string, number> = {
    T0: 0, T1: 1, T2: 2, T3: 3, 'T4+': 4,
  }
  const rooms = roomsMap[typology] ?? 2

  // Construct Idealista.pt search URL
  const slug = location
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  const searchUrl = `https://www.idealista.pt/comprar-casas/${slug}/`

  // Actor: try the most common Idealista scraper on Apify
  // Users can override via APIFY_ACTOR_ID env var
  const actorId = Deno.env.get('APIFY_ACTOR_ID') ?? 'dtrungtin/idealista-scraper'

  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${apifyToken}&timeout=60&memory=512`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
        maxResults: 20,
        minRooms: Math.max(0, rooms - 1),
        maxRooms: rooms + 1,
        minArea: Math.round(area * 0.7),
        maxArea: Math.round(area * 1.3),
        propertyType: 'homes',
        operation: 'sale',
      }),
    }
  )

  if (!runResponse.ok) {
    const text = await runResponse.text()
    console.error('Apify error:', text)
    return []
  }

  const items = await runResponse.json()
  if (!Array.isArray(items)) return []

  const eightMonthsAgo = Date.now() - 18 * 30 * 24 * 60 * 60 * 1000

  return items
    .filter((item: Record<string, unknown>) => {
      const price = Number(item.price ?? item.priceValue ?? 0)
      const itemArea = Number(item.size ?? item.area ?? 0)
      return price > 0 && itemArea > 0
    })
    .map((item: Record<string, unknown>) => {
      const price = Number(item.price ?? item.priceValue ?? 0)
      const itemArea = Number(item.size ?? item.area ?? 0)
      const pricePerSqm = itemArea > 0 ? price / itemArea : 0

      // Estimate days on market from publishedAt if available
      let daysOnMarket = Number(item.daysOnMarket ?? 0)
      if (!daysOnMarket && item.publishedAt) {
        const published = new Date(item.publishedAt as string).getTime()
        daysOnMarket = Math.round((Date.now() - published) / (1000 * 60 * 60 * 24))
      }

      return {
        title: String(item.title ?? item.description ?? 'Imóvel sem título'),
        price,
        area: itemArea,
        pricePerSqm: Math.round(pricePerSqm),
        daysOnMarket,
        url: item.url as string | undefined,
        location: String(item.location ?? item.address ?? location),
        rooms: String(item.rooms ?? typology),
      }
    })
    .filter((c) => {
      // Max 18 months on market
      return c.daysOnMarket === 0 || c.daysOnMarket <= 540
    })
    .slice(0, 15)
}

// ─── Market stats ─────────────────────────────────────────────────────────────

function calcMedian(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function calcMarketStats(comparables: Comparable[], area: number) {
  const prices = comparables.map((c) => c.price)
  const ppsm = comparables.map((c) => c.pricePerSqm).filter((v) => v > 0)

  return {
    min: Math.min(...(ppsm.length ? ppsm : [0])),
    max: Math.max(...(ppsm.length ? ppsm : [0])),
    median: calcMedian(prices),
    average: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    medianPricePerSqm: calcMedian(ppsm),
    averagePricePerSqm: ppsm.length ? ppsm.reduce((a, b) => a + b, 0) / ppsm.length : 0,
    count: comparables.length,
  }
}

// ─── Claude analysis ──────────────────────────────────────────────────────────

async function generateAnalysis(
  property: Record<string, unknown>,
  marketStats: ReturnType<typeof calcMarketStats>,
  financial: ReturnType<typeof calculateFinancials>,
  verdict: string,
  anthropicKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey: anthropicKey })

  const conditionLabels: Record<string, string> = {
    bad: 'Mau estado (obras estruturais)',
    renovation: 'Remodelação necessária',
    good: 'Bom estado',
    renovated: 'Remodelado',
  }

  const prompt = `És um analista de investimento imobiliário sénior a trabalhar para a Polar Investimentos. Analisa este imóvel e fornece um veredicto fundamentado.

IMÓVEL:
- Morada: ${property.address}
- Tipologia: ${property.typology}, ${property.area} m²
- Preço pedido: ${(property.askingPrice as number).toLocaleString('pt-PT')} €
- Condição: ${conditionLabels[property.condition as string] ?? property.condition}
- Estimativa de obras: ${(property.renovationCost as number).toLocaleString('pt-PT')} €

MERCADO (${marketStats.count} comparáveis activos, máx. 18 meses):
- Preço médio por m²: ${marketStats.averagePricePerSqm.toFixed(0)} €/m²
- Mediana por m²: ${marketStats.medianPricePerSqm.toFixed(0)} €/m²
- Range: ${marketStats.min.toFixed(0)} – ${marketStats.max.toFixed(0)} €/m²
- Preço pedido por m²: ${((property.askingPrice as number) / (property.area as number)).toFixed(0)} €/m²

FINANCEIRO:
- Investimento total: ${financial.totalAcquisitionCost.toLocaleString('pt-PT')} € (inclui IMT ${financial.imt.toLocaleString('pt-PT')} €)
- Preço estimado de venda: ${financial.estimatedSalePrice.toLocaleString('pt-PT')} €
- Lucro líquido estimado: ${financial.netProfit.toLocaleString('pt-PT')} €
- Margem líquida: ${financial.netMargin.toFixed(1)}%

VEREDICTO AUTOMÁTICO: ${verdict}

Escreve uma análise concisa (3-4 parágrafos) que:
1. Avalie o posicionamento de preço face ao mercado
2. Comente os riscos principais (obras, localização, liquidez)
3. Dê uma recomendação clara com o que fazer a seguir
4. Seja directo e prático — sem jargão desnecessário

Responde em português de Portugal.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apifyToken = Deno.env.get('polar-goldsearch_Apify-APIKey')
    const anthropicKey = Deno.env.get('polar-goldsearch_Claude-APIKey')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!apifyToken || !anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'API keys não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const property = await req.json()
    const { address, typology, area, askingPrice, condition, renovationCost } = property

    // 1. Fetch comparables
    const comparables = await fetchComparables(address, typology, area, apifyToken)

    // 2. Market stats
    const marketStats = calcMarketStats(comparables, area)

    // Estimated sale price = market median/sqm × area (conservative: use median)
    const estimatedSalePrice =
      marketStats.medianPricePerSqm > 0
        ? Math.round(marketStats.medianPricePerSqm * area)
        : Math.round(askingPrice * 1.1) // fallback: 10% above asking if no data

    // 3. Financials
    const financial = calculateFinancials(askingPrice, renovationCost ?? 0, estimatedSalePrice)
    const verdict = getVerdict(financial.netMargin)

    // 4. AI analysis
    const aiAnalysis = await generateAnalysis(
      property,
      marketStats,
      financial,
      verdict,
      anthropicKey
    )

    const result = {
      property,
      comparables,
      marketStats,
      financial,
      verdict,
      aiAnalysis,
      createdAt: new Date().toISOString(),
    }

    // 5. Save to DB (non-blocking)
    if (supabaseUrl && supabaseKey) {
      const db = createClient(supabaseUrl, supabaseKey)
      await db.from('analyses').insert({
        address,
        typology,
        area,
        asking_price: askingPrice,
        verdict,
        net_margin: financial.netMargin,
        result,
        created_at: result.createdAt,
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('analyze-property error:', err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
