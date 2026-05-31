import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { recentQuarters, categoryValue } from '../_shared/ine.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const INE_BASE = 'https://www.ine.pt/ine/json_indicador/pindica.jsp'
const INDICATOR = '0012234'

// 8 most-recent published quarters, oldest → newest (for the trend chart).
// Computed dynamically so the window never goes stale as new quarters publish.
const QUARTERS = recentQuarters(8).reverse()

// Regions to surface in the dashboard — using confirmed alphanumeric INE codes
// discovered via bulk fetch (no Dim2). Ordered for display.
const DASHBOARD_REGIONS = [
  // National / macro
  { code: 'PT',   name: 'Portugal',                  group: 'nacional'  },
  { code: '1A',   name: 'Grande Lisboa',              group: 'lisboa'    },
  { code: '11A',  name: 'A.M. do Porto',              group: 'porto'     },
  { code: '1B',   name: 'Península de Setúbal',       group: 'lisboa'    },
  { code: '15',   name: 'Algarve',                    group: 'algarve'   },
  { code: '1C1',  name: 'Alentejo Litoral',            group: 'alentejo'  },
  { code: '1D1',  name: 'Oeste',                      group: 'centro'    },
  { code: '19',   name: 'Centro',                     group: 'centro'    },
  { code: '11',   name: 'Norte',                      group: 'norte'     },
  { code: '1C',   name: 'Alentejo',                   group: 'alentejo'  },
  { code: '3',    name: 'Madeira',                    group: 'ilhas'     },
  { code: '2',    name: 'Açores',                     group: 'ilhas'     },
  // District-level codes for choropleth map coverage
  { code: '191',  name: 'Região de Aveiro',           group: 'centro'    },
  { code: '192',  name: 'Região de Coimbra',          group: 'centro'    },
  { code: '193',  name: 'Região de Leiria',           group: 'centro'    },
  { code: '194',  name: 'Viseu Dão Lafões',           group: 'centro'    },
  { code: '195',  name: 'Beira Baixa',                group: 'centro'    },
  { code: '196',  name: 'Beiras e Serra da Estrela',  group: 'centro'    },
  { code: '111',  name: 'Alto Minho',                 group: 'norte'     },
  { code: '112',  name: 'Cávado',                     group: 'norte'     },
  { code: '119',  name: 'Ave',                        group: 'norte'     },
  { code: '11D',  name: 'Douro',                      group: 'norte'     },
  { code: '11E',  name: 'Terras de Trás-os-Montes',  group: 'norte'     },
  { code: '1C2',  name: 'Baixo Alentejo',             group: 'alentejo'  },
  { code: '1C3',  name: 'Alto Alentejo',              group: 'alentejo'  },
  { code: '1C4',  name: 'Alentejo Central',           group: 'alentejo'  },
  { code: '1D2',  name: 'Médio Tejo',                 group: 'centro'    },
  { code: '1D3',  name: 'Lezíria do Tejo',            group: 'centro'    },
  // Key municipalities
  { code: '1A01106', name: 'Lisboa',                  group: 'lisboa'    },
  { code: '1A01105', name: 'Cascais',                 group: 'lisboa'    },
  { code: '1A01110', name: 'Oeiras',                  group: 'lisboa'    },
  { code: '1A01111', name: 'Sintra',                  group: 'lisboa'    },
  { code: '1A01107', name: 'Loures',                  group: 'lisboa'    },
  { code: '1A01116', name: 'Odivelas',                group: 'lisboa'    },
  { code: '1A01114', name: 'Vila Franca de Xira',     group: 'lisboa'    },
  { code: '1A01115', name: 'Amadora',                 group: 'lisboa'    },
  { code: '1B01503', name: 'Almada',                  group: 'lisboa'    },
  { code: '11A1312', name: 'Porto',                   group: 'porto'     },
  { code: '11A1308', name: 'Matosinhos',              group: 'porto'     },
  { code: '11A1317', name: 'Vila Nova de Gaia',       group: 'porto'     },
  { code: '11A1306', name: 'Maia',                    group: 'porto'     },
  { code: '11A1304', name: 'Gondomar',                group: 'porto'     },
  { code: '1500808', name: 'Loulé',                   group: 'algarve'   },
  { code: '1500807', name: 'Lagos',                   group: 'algarve'   },
  { code: '1500801', name: 'Albufeira',               group: 'algarve'   },
  { code: '3003103', name: 'Funchal',                 group: 'ilhas'     },
]

// deno-lint-ignore no-explicit-any
function extractValues(entries: any[]): { total: number; novos: number; existentes: number } {
  return {
    total: categoryValue(entries, 'Total'),
    novos: categoryValue(entries, 'Novos'),
    existentes: categoryValue(entries, 'Existentes'),
  }
}

/**
 * Fetch bulk data for ALL geographies at once (no Dim2).
 * Much more reliable than individual queries — the INE API rate-limits
 * concurrent individual calls but the bulk endpoint is fast.
 */
// deno-lint-ignore no-explicit-any
async function fetchBulkQuarter(quarter: string): Promise<Map<string, any[]>> {
  const url = `${INE_BASE}?op=2&varcd=${INDICATOR}&Dim1=${quarter}&lang=PT`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return new Map()
    const raw = await res.json()
    const dados = raw?.[0]?.Dados
    if (!dados) return new Map()

    const allEntries = Array.isArray(dados)
      ? dados
      : Object.values(dados)[0] as unknown[] ?? []

    // Group entries by geocode
    // deno-lint-ignore no-explicit-any
    const byCode = new Map<string, any[]>()
    // deno-lint-ignore no-explicit-any
    for (const e of allEntries as any[]) {
      const c = e?.geocod ?? ''
      if (!byCode.has(c)) byCode.set(c, [])
      byCode.get(c)!.push(e)
    }
    return byCode
  } catch (err) {
    console.error(`fetchBulkQuarter(${quarter}) error:`, err)
    return new Map()
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const latestQuarter = QUARTERS[QUARTERS.length - 1]
    const prevYearQuarter =
      QUARTERS.find(q => q.year === latestQuarter.year - 1 && q.quarter === latestQuarter.quarter)
      ?? QUARTERS[Math.max(0, QUARTERS.length - 5)]

    // 1. Fetch every quarter once (parallel batches of 4) and reuse the maps for
    // both the regional snapshot and the trend series — no quarter fetched twice.
    const quarterMaps = new Map<string, Awaited<ReturnType<typeof fetchBulkQuarter>>>()
    for (let i = 0; i < QUARTERS.length; i += 4) {
      const batch = QUARTERS.slice(i, i + 4)
      const maps = await Promise.all(batch.map(q => fetchBulkQuarter(q.code)))
      batch.forEach((q, j) => quarterMaps.set(q.code, maps[j]))
    }

    const latestMap = quarterMaps.get(latestQuarter.code) ?? new Map()
    const prevMap = quarterMaps.get(prevYearQuarter.code) ?? new Map()

    // 2. Build region data from bulk maps
    const regions = DASHBOARD_REGIONS.map(r => {
      const latestEntries = latestMap.get(r.code) ?? []
      const prevEntries = prevMap.get(r.code) ?? []
      const latest = extractValues(latestEntries)
      const prev = extractValues(prevEntries)

      const yoy = latest.total > 0 && prev.total > 0
        ? parseFloat((((latest.total - prev.total) / prev.total) * 100).toFixed(1))
        : null

      return {
        code: r.code,
        name: r.name,
        group: r.group,
        median: latest.total,
        medianNew: latest.novos,
        medianExisting: latest.existentes,
        yoy,
      }
    }).filter(r => r.median > 0)
      .sort((a, b) => b.median - a.median)

    // 3. Trend — reuse the already-fetched quarter maps (national 'PT' series)
    const trendData: Array<{ quarter: string; code: string; median: number; medianNew: number; medianExisting: number }> = []

    for (const q of QUARTERS) {
      const entries = quarterMaps.get(q.code)?.get('PT') ?? []
      const vals = extractValues(entries)
      if (vals.total > 0) {
        trendData.push({
          quarter: q.label,
          code: q.code,
          median: vals.total,
          medianNew: vals.novos,
          medianExisting: vals.existentes,
        })
      }
    }

    const national = regions.find(r => r.code === 'PT')

    return new Response(JSON.stringify({
      updatedAt: new Date().toISOString(),
      latestPeriod: latestQuarter.label,
      national,
      regions,
      trend: trendData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('market-data error:', err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
