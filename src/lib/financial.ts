import type { FinancialBreakdown } from './types'

// IMT for investment property (no habitação própria exemption)
// Applied as flat rate on total purchase price (not marginal)
export function calculateIMT(purchasePrice: number): number {
  if (purchasePrice <= 97064) return purchasePrice * 0.01
  if (purchasePrice <= 132774) return purchasePrice * 0.02
  if (purchasePrice <= 181034) return purchasePrice * 0.05
  if (purchasePrice <= 301688) return purchasePrice * 0.07
  if (purchasePrice <= 578598) return purchasePrice * 0.08
  return purchasePrice * 0.06
}

export function calculateFinancials(
  purchasePrice: number,
  renovationCost: number,
  estimatedSalePrice: number
): FinancialBreakdown {
  // Acquisition costs
  const imt = calculateIMT(purchasePrice)
  const stampDuty = purchasePrice * 0.008
  const notaryFees = 700

  const totalAcquisitionCost =
    purchasePrice + imt + stampDuty + notaryFees + renovationCost

  // Sale costs
  const agencyCommission = estimatedSalePrice * 0.05
  const agencyVAT = agencyCommission * 0.23
  const energyCertificate = 300

  // Capital gains tax: 50% of gain × 28%
  const capitalGain = estimatedSalePrice - totalAcquisitionCost
  const capitalGainsTax =
    capitalGain > 0 ? capitalGain * 0.5 * 0.28 : 0

  const totalSaleCosts =
    agencyCommission + agencyVAT + capitalGainsTax + energyCertificate

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
  }
}

export function getVerdictFromMargin(netMargin: number) {
  if (netMargin < 15) return 'pass' as const
  if (netMargin < 20) return 'grey_zone' as const
  if (netMargin < 30) return 'investigate' as const
  return 'excellent' as const
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
