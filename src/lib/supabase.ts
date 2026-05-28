import { createClient } from '@supabase/supabase-js'
import type { AnalysisResult, AnalysisSummary, PropertyInput } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


export async function analyzeProperty(
  property: PropertyInput
): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke('analyze-property', {
    body: property,
  })

  if (error) throw new Error(error.message)
  return data as AnalysisResult
}

export async function getAnalysisHistory(): Promise<AnalysisSummary[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select(
      'id, address, typology, area, asking_price, verdict, net_margin, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    address: row.address,
    typology: row.typology,
    area: row.area,
    askingPrice: row.asking_price,
    verdict: row.verdict,
    netMargin: row.net_margin,
    createdAt: row.created_at,
  }))
}

export async function getAnalysisById(
  id: string
): Promise<AnalysisResult | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  if (!data) return null

  return data.result as AnalysisResult
}
