// Shared INE (Instituto Nacional de Estatística) helpers used by both the
// analyze-property and market-data edge functions. Keeping the quarter logic
// and response parsing here avoids the two functions drifting apart.

export interface Quarter {
  code: string   // e.g. "S5A20254" (INE Dim1 format)
  label: string  // e.g. "Q4 2025"
  year: number
  quarter: number
}

/**
 * Generate the most recent `count` quarters, newest first.
 *
 * INE publishes indicator 0012234 roughly one quarter in arrears, so `lag`
 * steps back from the current calendar quarter to the most recently published
 * one (default 2 = safe). Callers that fetch a window can over-request and skip
 * quarters that return no data yet.
 */
export function recentQuarters(count: number, lag = 2): Quarter[] {
  const now = new Date()
  let y = now.getUTCFullYear()
  let q = Math.floor(now.getUTCMonth() / 3) + 1 // 1..4

  for (let i = 0; i < lag; i++) { q--; if (q < 1) { q = 4; y-- } }

  const out: Quarter[] = []
  for (let i = 0; i < count; i++) {
    out.push({ code: `S5A${y}${q}`, label: `Q${q} ${y}`, year: y, quarter: q })
    q--; if (q < 1) { q = 4; y-- }
  }
  return out
}

/**
 * Extract a category value ('Total' | 'Novos' | 'Existentes') from a list of
 * INE "Dados" entries. The API uses different field names across endpoints
 * (`dim_3_t` in the bulk feed, `categ_Dim3`/`categ` in single-geo queries), so
 * we check all of them. Set `fallbackToFirst` to use the first entry when no
 * category matches (useful for single-geo Total lookups).
 */
// deno-lint-ignore no-explicit-any
export function categoryValue(entries: any[], category: string, fallbackToFirst = false): number {
  if (!Array.isArray(entries) || entries.length === 0) return 0
  const want = category.toLowerCase()
  // deno-lint-ignore no-explicit-any
  const match = entries.find((e: any) => {
    const field = String(e?.dim_3_t ?? e?.categ_Dim3 ?? e?.categ ?? '').toLowerCase()
    return field === want || field.includes(want)
  })
  const chosen = match ?? (fallbackToFirst ? entries[0] : null)
  if (!chosen) return 0
  const v = parseFloat(chosen?.valor ?? '0')
  return Number.isFinite(v) && v > 0 ? Math.round(v) : 0
}
