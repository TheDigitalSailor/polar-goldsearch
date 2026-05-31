import type { AnalysisResult } from './types'

export const MOCK_RESULT: AnalysisResult = {
  property: {
    address: 'Rua da Mouraria 14, 2.º Esq, Lisboa',
    typology: 'T2',
    area: 78,
    askingPrice: 195000,
    condition: 'renovation',
    renovationCost: 30000,
  },
  comparables: [
    { title: 'Apartamento T2 renovado, Mouraria, Lisboa', price: 275000, area: 80, pricePerSqm: 3437, daysOnMarket: 42, url: 'https://idealista.pt', location: 'Mouraria, Lisboa' },
    { title: 'T2 com luz natural, Alfama, Lisboa', price: 248000, area: 72, pricePerSqm: 3444, daysOnMarket: 87, url: 'https://idealista.pt', location: 'Alfama, Lisboa' },
    { title: 'Apartamento T2 c/ varanda, Graça', price: 310000, area: 85, pricePerSqm: 3647, daysOnMarket: 15, url: 'https://idealista.pt', location: 'Graça, Lisboa' },
    { title: 'T2 para recuperar, Mouraria', price: 210000, area: 75, pricePerSqm: 2800, daysOnMarket: 210, url: 'https://idealista.pt', location: 'Mouraria, Lisboa' },
    { title: 'T2 moderno, Santa Apolónia', price: 289000, area: 76, pricePerSqm: 3803, daysOnMarket: 31, url: 'https://idealista.pt', location: 'Santa Apolónia, Lisboa' },
    { title: 'Apartamento T2, Intendente, Lisboa', price: 255000, area: 82, pricePerSqm: 3109, daysOnMarket: 64, url: 'https://idealista.pt', location: 'Intendente, Lisboa' },
  ],
  marketStats: {
    min: 2800,
    max: 3803,
    medianPricePerSqm: 3290,
    count: 6,
  },
  valuation: {
    fairPricePerSqm: 2900,
    minPricePerSqm: 2500,
    maxPricePerSqm: 3350,
    rationale: 'Ancorado entre a mediana INE e os preços pedidos, com desconto pedido→transação de ~12% e ajuste pela necessidade de obras.',
  },
  financial: {
    purchasePrice: 195000,
    imt: 13650,
    stampDuty: 1560,
    notaryFees: 700,
    renovationCost: 30000,
    totalAcquisitionCost: 240910,
    estimatedSalePrice: 256620,
    agencyCommission: 12831,
    agencyVAT: 2951,
    capitalGainsTax: 2197,
    energyCertificate: 300,
    totalSaleCosts: 18279,
    grossProfit: 31620,
    netProfit: -2569,
    netMargin: -1.1,
  },
  ineData: {
    medianPricePerSqm: 3150,
    priceChangePct: 8.4,
    period: 'Q4 2025',
    region: 'A.M. de Lisboa',
  },
  verdict: 'pass',
  aiAnalysis: `Este imóvel está a ser pedido a €2.500/m², abaixo da mediana de mercado para a zona (€3.290/m²), o que à partida parece interessante. No entanto, os custos de aquisição e obra consomem grande parte dessa margem aparente.

O problema central é o custo de saída: com obras de €30.000 e custos fiscais de compra de ~€16.000 (IMT + IS + escritura), o break-even de venda sobe para €259.000. A mediana de mercado sugere um preço de venda de ~€256.000 — praticamente no limite, deixando margem líquida negativa.

Para este negócio funcionar, seria necessário: (1) negociar o preço de compra abaixo de €185.000, ou (2) reduzir a estimativa de obras para menos de €20.000, ou (3) ter confiança que a venda superará €270.000 com a remodelação.

Recomendação: não avançar com estes números. Se conseguires negociar o preço para €175.000–€180.000, reavalia.`,
  createdAt: new Date().toISOString(),
}
