export type Typology = 'T0' | 'T1' | 'T2' | 'T3' | 'T4+'
export type Condition = 'bad' | 'renovation' | 'good' | 'renovated'
export type VerdictType = 'pass' | 'grey_zone' | 'investigate' | 'excellent'

export interface PropertyInput {
  address: string
  typology: Typology
  area: number
  askingPrice: number
  condition: Condition
  renovationCost: number
  comments?: string
}

export interface Comparable {
  title: string
  price: number
  area: number
  pricePerSqm: number
  daysOnMarket: number
  url?: string
  location: string
  rooms?: string
}

export interface MarketStats {
  min: number
  max: number
  medianPricePerSqm: number
  count: number
}

/**
 * Transaction-realistic fair-value estimate produced by Claude from the
 * Imovirtual asking comparables + INE benchmark + property condition.
 * Distinct from MarketStats, which reflects raw *asking* prices.
 */
export interface Valuation {
  fairPricePerSqm: number   // realistic transaction median €/m²
  minPricePerSqm: number    // realistic transaction range, low
  maxPricePerSqm: number    // realistic transaction range, high
  rationale?: string        // short note on how the estimate was derived
}

export interface FinancialBreakdown {
  // Costs
  purchasePrice: number
  imt: number
  stampDuty: number
  notaryFees: number
  renovationCost: number
  totalAcquisitionCost: number

  // Sale
  estimatedSalePrice: number
  agencyCommission: number
  agencyVAT: number
  capitalGainsTax: number
  energyCertificate: number
  totalSaleCosts: number

  // Result
  grossProfit: number
  netProfit: number
  netMargin: number
}

export interface INEMarketData {
  medianPricePerSqm: number
  priceChangePct: number | null
  period: string   // e.g. "Q4 2025"
  region: string   // e.g. "A.M. de Lisboa"
}

export interface AnalysisResult {
  id?: string
  property: PropertyInput
  comparables: Comparable[]
  marketStats: MarketStats
  valuation: Valuation
  ineData: INEMarketData | null
  financial: FinancialBreakdown
  verdict: VerdictType
  aiAnalysis: string
  createdAt?: string
}

export interface AnalysisSummary {
  id: string
  address: string
  typology: Typology
  area: number
  askingPrice: number
  verdict: VerdictType
  netMargin: number
  createdAt: string
}
