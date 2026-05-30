import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const INE_BASE = 'https://www.ine.pt/ine/json_indicador/pindica.jsp'
const INDICATOR = '0012234'

// Last 8 quarters for trend chart
const QUARTERS = [
  { code: 'S5A20241', label: 'Q1 2024' },
  { code: 'S5A20242', label: 'Q2 2024' },
  { code: 'S5A20243', label: 'Q3 2024' },
  { code: 'S5A20244', label: 'Q4 2024' },
  { code: 'S5A20251', label: 'Q1 2025' },
  { code: 'S5A20252', label: 'Q2 2025' },
  { code: 'S5A20253', label: 'Q3 2025' },
  { code: 'S5A20254', label: 'Q4 2025' },
]

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
  const get = (t: string) => {
    const e = entries.find((x: any) => x?.dim_3_t === t)
    const v = parseFloat(e?.valor ?? '0')
    return Number.isFinite(v) && v > 0 ? Math.round(v) : 0
  }
  return { total: get('Total'), novos: get('Novos'), existentes: get('Existentes') }
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
    const prevYearQuarter = QUARTERS[QUARTERS.length - 5] // Q4 2024

    console.log('Fetching bulk INE data for', latestQuarter.code, 'and', prevYearQuarter.code)

    // 1. Bulk fetch latest + prev year in parallel for YoY
    const [latestMap, prevMap] = await Promise.all([
      fetchBulkQuarter(latestQuarter.code),
      fetchBulkQuarter(prevYearQuarter.code),
    ])

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

    // 3. Trend — bulk fetch each quarter (in parallel batches of 4)
    const trendData: Array<{ quarter: string; code: string; median: number; medianNew: number; medianExisting: number }> = []

    for (let i = 0; i < QUARTERS.length; i += 4) {
      const batch = QUARTERS.slice(i, i + 4)
      const maps = await Promise.all(batch.map(q => fetchBulkQuarter(q.code)))
      for (let j = 0; j < batch.length; j++) {
        const entries = maps[j].get('PT') ?? []
        const vals = extractValues(entries)
        if (vals.total > 0) {
          trendData.push({
            quarter: batch[j].label,
            code: batch[j].code,
            median: vals.total,
            medianNew: vals.novos,
            medianExisting: vals.existentes,
          })
        }
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
