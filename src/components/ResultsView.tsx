import { useState, useMemo } from 'react'
import { ArrowLeft, ExternalLink, TrendingDown, TrendingUp, Minus, Trophy, BarChart2, Calculator, Building2, MapPin, Info, Ruler, Clock, Home, AlertTriangle } from 'lucide-react'
import type { AnalysisResult, VerdictType, Valuation } from '../lib/types'
import { formatCurrency, formatPercent } from '../lib/financial'

interface Props {
  result: AnalysisResult
  onBack: () => void
}

const verdictConfig: Record<VerdictType, {
  icon: string; label: string; textColor: string; bg: string; border: string; marginColor: string
  badgeBg: string; badgeText: string
}> = {
  excellent:   { icon: '🚀', label: 'Excelente oportunidade', textColor: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', marginColor: 'text-emerald-600', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800' },
  investigate: { icon: '✅', label: 'Merece investigar',     textColor: 'text-lime-700',    bg: 'bg-lime-50',    border: 'border-lime-200',    marginColor: 'text-lime-600',    badgeBg: 'bg-lime-100',    badgeText: 'text-lime-800'    },
  grey_zone:   { icon: '⚠️', label: 'Zona cinzenta',        textColor: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   marginColor: 'text-amber-600',   badgeBg: 'bg-amber-100',   badgeText: 'text-amber-800'   },
  pass:        { icon: '❌', label: 'Mau negócio',           textColor: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     marginColor: 'text-red-600',     badgeBg: 'bg-red-100',     badgeText: 'text-red-800'     },
}

export default function ResultsView({ result, onBack }: Props) {
  const { property, comparables, marketStats, ineData, financial, verdict, aiAnalysis } = result
  const cfg = verdictConfig[verdict]

  // Transaction valuation drives the price positioning. Older saved analyses
  // predate this field — fall back to a ~12% haircut on asking stats.
  const valuation: Valuation = result.valuation ?? {
    fairPricePerSqm: Math.round(marketStats.medianPricePerSqm * 0.88),
    minPricePerSqm: Math.round(marketStats.min * 0.92),
    maxPricePerSqm: Math.round(marketStats.max * 0.92),
  }

  // ── Sale price slider state ───────────────────────────────────────────────
  const [salePrice, setSalePrice] = useState(financial.estimatedSalePrice)
  const minPrice = Math.round(financial.estimatedSalePrice * 0.55)
  const maxPrice = Math.round(financial.estimatedSalePrice * 1.55)
  const sliderPct = Math.min(100, Math.max(0,
    ((salePrice - minPrice) / (maxPrice - minPrice)) * 100
  ))
  const estimatedPct = Math.min(100, Math.max(0,
    ((financial.estimatedSalePrice - minPrice) / (maxPrice - minPrice)) * 100
  ))
  const zoneLabel =
    salePrice < financial.estimatedSalePrice * 0.97 ? 'Abaixo do mercado' :
    salePrice > financial.estimatedSalePrice * 1.03 ? 'Acima do mercado' :
    'Preço estimado'
  const zoneColor =
    salePrice < financial.estimatedSalePrice * 0.97 ? 'text-red-500' :
    salePrice > financial.estimatedSalePrice * 1.03 ? 'text-emerald-600' :
    'text-amber-600'

  // Recalculate sale-side figures when slider moves (verdict stays fixed)
  const adj = useMemo(() => {
    const agencyCommission = salePrice * 0.05
    const agencyVAT        = agencyCommission * 0.23
    const energyCertificate = financial.energyCertificate
    const capitalGain      = salePrice - financial.totalAcquisitionCost
    const capitalGainsTax  = capitalGain > 0 ? capitalGain * 0.5 * 0.28 : 0
    const totalSaleCosts   = agencyCommission + agencyVAT + capitalGainsTax + energyCertificate
    const netProfit        = salePrice - financial.totalAcquisitionCost - totalSaleCosts
    const netMargin        = (netProfit / financial.totalAcquisitionCost) * 100
    return { agencyCommission, agencyVAT, capitalGainsTax, energyCertificate,
             totalSaleCosts, netProfit, netMargin }
  }, [salePrice, financial])

  const askingPricePerSqm = Math.round(property.askingPrice / property.area)
  const priceDiff = valuation.fairPricePerSqm > 0
    ? ((askingPricePerSqm - valuation.fairPricePerSqm) / valuation.fairPricePerSqm) * 100
    : 0

  const range = (valuation.maxPricePerSqm - valuation.minPricePerSqm) || 1
  // Extend bar 25% past max so the max dot lands at ~80% — leaves visual breathing room
  const barRange = range * 1.25
  const propertyBarPos = Math.min(93, Math.max(5, ((askingPricePerSqm - valuation.minPricePerSqm) / barRange) * 100))
  const medianBarPos   = Math.min(93, Math.max(5, ((valuation.fairPricePerSqm - valuation.minPricePerSqm) / barRange) * 100))
  const maxBarPos      = Math.min(93, Math.max(5, ((valuation.maxPricePerSqm - valuation.minPricePerSqm) / barRange) * 100))

  const isBelow = priceDiff < -5
  const isAbove = priceDiff > 5

  const paragraphs = aiAnalysis.split(/\n+/).filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">

      {/* ── Top bar ── */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-polar-ink-muted hover:text-polar-ink transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Nova análise
        </button>
        <h2 className="text-lg sm:text-2xl font-semibold text-polar-ink leading-tight">
          {property.address}
        </h2>
        <p className="text-sm text-polar-ink-muted mt-1.5">
          {property.typology} · {property.area} m² · {formatCurrency(property.askingPrice)} pedido
        </p>
      </div>

      {/* ── 1. POSICIONAMENTO DE PREÇO ── */}
      <section id="price">
        <SectionLabel icon={<BarChart2 size={13}/>}>Posicionamento de preço</SectionLabel>
        <div className="card">

          {/* 3 price columns */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div>
              <div className="text-[10px] font-semibold text-polar-ink-muted uppercase tracking-wider mb-2">Este imóvel</div>
              <div className={`text-xl sm:text-2xl font-bold ${isBelow ? 'text-emerald-700' : isAbove ? 'text-red-600' : 'text-amber-600'}`}>
                {formatCurrency(property.askingPrice)}
              </div>
              <div className="text-xs text-polar-ink-muted mt-0.5">{formatCurrency(askingPricePerSqm)}/m²</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-semibold text-polar-ink-muted uppercase tracking-wider mb-2">Preço médio</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-700">
                {formatCurrency(Math.round(valuation.fairPricePerSqm * property.area))}
              </div>
              <div className="text-xs text-polar-ink-muted mt-0.5">{formatCurrency(valuation.fairPricePerSqm)}/m²</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-polar-ink-muted uppercase tracking-wider mb-2">Preço máximo</div>
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {formatCurrency(Math.round(valuation.maxPricePerSqm * property.area))}
              </div>
              <div className="text-xs text-polar-ink-muted mt-0.5">{formatCurrency(valuation.maxPricePerSqm)}/m²</div>
            </div>
          </div>

          {/* Bar with floating labels + markers */}
          <div className="relative" style={{ paddingTop: '44px', marginBottom: '28px' }}>

            {/* Property label + connector line */}
            <div className="absolute flex flex-col items-center" style={{ left: `${propertyBarPos}%`, top: 0, transform: 'translateX(-50%)' }}>
              <span className="text-xs font-semibold text-polar-ink whitespace-nowrap">{formatCurrency(askingPricePerSqm)}/m²</span>
              <div className="w-px bg-polar-ink/35 mt-1" style={{ height: '24px' }} />
            </div>

            {/* Median label + connector line */}
            <div className="absolute flex flex-col items-center" style={{ left: `${medianBarPos}%`, top: 0, transform: 'translateX(-50%)' }}>
              <span className="text-xs text-polar-ink-muted whitespace-nowrap">{formatCurrency(valuation.fairPricePerSqm)}/m²</span>
              <div className="w-px bg-polar-ink/20 mt-1" style={{ height: '24px' }} />
            </div>

            {/* Max label + connector line */}
            <div className="absolute flex flex-col items-center" style={{ left: `${maxBarPos}%`, top: 0, transform: 'translateX(-50%)' }}>
              <span className="text-xs text-polar-ink-muted whitespace-nowrap">{formatCurrency(valuation.maxPricePerSqm)}/m²</span>
              <div className="w-px bg-polar-ink/20 mt-1" style={{ height: '24px' }} />
            </div>

            {/* Gradient bar */}
            <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500">

              {/* Property marker — house icon circle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border-2 border-emerald-600 shadow-sm flex items-center justify-center z-10"
                style={{ left: `${propertyBarPos}%` }}
              >
                <Home size={15} className="text-emerald-600" />
              </div>

              {/* Median marker — small open circle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-amber-500 z-10"
                style={{ left: `${medianBarPos}%` }}
              />

              {/* Max marker — small open circle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-red-400 z-10"
                style={{ left: `${maxBarPos}%` }}
              />
            </div>
          </div>

          {/* Bottom summary */}
          <div className={`flex items-center gap-2 text-sm font-medium ${isBelow ? 'text-emerald-700' : isAbove ? 'text-red-600' : 'text-amber-600'}`}>
            {isBelow ? <TrendingDown size={14}/> : isAbove ? <TrendingUp size={14}/> : <Minus size={14}/>}
            <span>
              Este imóvel está {Math.abs(priceDiff).toFixed(0)}%{' '}
              {isBelow ? 'abaixo' : isAbove ? 'acima' : 'na'} da mediana
            </span>
            <span className="text-polar-ink-muted font-normal">· {comparables.length} comparáveis activos na zona</span>
          </div>
          {valuation.rationale && (
            <p className="text-[10px] text-polar-ink-muted/50 mt-2 leading-relaxed">{valuation.rationale}</p>
          )}

        </div>
      </section>

      {/* ── 2. SINAIS DE MERCADO ── */}
      {(comparables.length > 0 || ineData) && (() => {
        // Extract best available location label for the section header
        const addrParts = property.address.split(',').map(s => s.trim()).filter(Boolean)
        const locationLabel = addrParts.length >= 2
          ? addrParts[addrParts.length - 2]
          : ineData?.region || ''

        // Negotiation: how much below asking do transactions typically close (negative = room to negotiate)
        const negotiationPct = (ineData && ineData.medianPricePerSqm > 0 && marketStats.medianPricePerSqm > 0)
          ? ((ineData.medianPricePerSqm - marketStats.medianPricePerSqm) / marketStats.medianPricePerSqm) * 100
          : null

        // Supply badge
        const supplyBadge = comparables.length < 10
          ? { label: 'Limitada', className: 'text-blue-700 bg-blue-50 border-blue-200' }
          : comparables.length <= 20
          ? { label: 'Moderada', className: 'text-amber-700 bg-amber-50 border-amber-200' }
          : { label: 'Alta',     className: 'text-red-600 bg-red-50 border-red-200' }

        const supplyDesc = comparables.length < 10
          ? 'Poucos imóveis à venda significa menos concorrência quando chegar a hora de vender após remodelação.'
          : comparables.length <= 20
          ? 'Oferta moderada na zona. Concorrência razoável no momento de revenda — preço e acabamentos vão fazer a diferença.'
          : 'Muitos imóveis em oferta. Mais concorrência no momento de revenda — o imóvel precisa de se destacar.'

        return (
          <section id="market">
            <SectionLabel icon={<MapPin size={13}/>}>
              Sinais de mercado{locationLabel ? ` · ${locationLabel}` : ''}
            </SectionLabel>
            <div className="card space-y-5">

              {/* ── Card 1: Negociação ── */}
              {negotiationPct !== null && (
                <SignalCard
                  label="Negociação"
                  value={`${negotiationPct.toFixed(0)}%`}
                  valueColor="text-amber-900"
                  badge={{ label: '— Estimativa', className: 'text-amber-800 bg-amber-50 border-amber-200' }}
                  description="Diferença típica entre preço pedido e transacção real neste município. Indica espaço para negociar abaixo do valor pedido."
                  footnote={
                    <span className="flex items-start gap-1">
                      <AlertTriangle size={11} className="flex-shrink-0 mt-0.5"/>
                      Estimativa municipal (INE vs. Imovirtual) — não específica a esta tipologia ou zona exacta.
                    </span>
                  }
                />
              )}

              {/* ── Card 2: Valorização a.a. ── */}
              {ineData?.priceChangePct != null && (() => {
                const pct = ineData.priceChangePct!
                const up = pct > 0
                const valBadge = up
                  ? { label: '↗ Em alta',  className: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
                  : { label: '↘ Em baixa', className: 'text-red-600 bg-red-50 border-red-200' }
                const valDesc = pct >= 15
                  ? 'O mercado desta zona está a valorizar a um ritmo acelerado. Bom sinal para revenda após obras.'
                  : pct >= 5
                  ? 'Valorização moderada e consistente. Tendência positiva para revenda no médio prazo.'
                  : pct >= 0
                  ? 'Valorização lenta. O timing de saída será importante para garantir margem.'
                  : 'Mercado em desvalorização. Reavalie o horizonte de saída e o preço de compra.'
                return (
                  <SignalCard
                    label="Valorização A.A."
                    value={`${up ? '+' : ''}${pct.toFixed(0)}%`}
                    valueColor={up ? 'text-emerald-700' : 'text-red-600'}
                    badge={valBadge}
                    description={valDesc}
                    footnote={<span className="flex items-center gap-1"><Info size={11}/> Fonte: INE Portugal · {ineData.region} · {ineData.period}.</span>}
                  />
                )
              })()}

              {/* ── Card 3: Oferta activa ── */}
              {comparables.length > 0 && (
                <SignalCard
                  label="Oferta activa"
                  value={String(comparables.length)}
                  valueColor="text-blue-700"
                  badge={{ label: supplyBadge.label, className: `${supplyBadge.className} flex items-center gap-1`, icon: <Building2 size={11}/> }}
                  description={supplyDesc}
                  footnote={<span className="flex items-center gap-1"><Info size={11}/> Fonte: Imovirtual · {property.typology} · raio 5km · activos há menos de 18 meses.</span>}
                />
              )}

            </div>
          </section>
        )
      })()}

      {/* ── 3. ANÁLISE FINANCEIRA ── */}
      <section id="financial">
        <SectionLabel icon={<Calculator size={13}/>}>Análise financeira</SectionLabel>
        <div className="card">

          {/* Custos de compra */}
          <ColLabel>Custos de compra</ColLabel>
          <div className="divide-y divide-polar-line">
            <FinRow label="Preço de compra"        value={formatCurrency(financial.purchasePrice)} />
            <FinRow label={`IMT (${formatPercent((financial.imt / financial.purchasePrice) * 100)})`} value={formatCurrency(financial.imt)} neg />
            <FinRow label="Imposto de Selo (0.8%)" value={formatCurrency(financial.stampDuty)} neg />
            <FinRow label="Escritura e registos"   value={formatCurrency(financial.notaryFees)} neg />
            {financial.renovationCost > 0 &&
              <FinRow label="Obras" value={formatCurrency(financial.renovationCost)} neg />}
          </div>
          <div className="border-t border-polar-line mt-2 pt-2">
            <FinRow label="Total investido" value={formatCurrency(financial.totalAcquisitionCost)} bold />
          </div>

          {/* ── Sale price slider ── */}
          <div className="mt-6 pt-5 border-t border-polar-line">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xs font-semibold text-polar-ink-muted uppercase tracking-wider">
                Preço de venda
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-polar-ink">{formatCurrency(salePrice)}</span>
                <span className={`text-xs font-semibold ${zoneColor}`}>{zoneLabel}</span>
              </div>
            </div>

            {/* Gradient track */}
            <div className="relative h-8 flex items-center mb-2">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400">
                {/* "Estimated" reference marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-white/70 rounded-full"
                  style={{ left: `${estimatedPct}%`, transform: 'translateX(-50%)' }}
                />
              </div>
              {/* Invisible range input for interaction */}
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                step={5000}
                value={salePrice}
                onChange={e => setSalePrice(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
              />
              {/* Custom thumb */}
              <div
                className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-2 border-polar-ink/25 shadow-md pointer-events-none z-20"
                style={{ left: `${sliderPct}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              />
            </div>

            {/* Min / ref / max labels */}
            <div className="flex justify-between text-[10px] text-polar-ink-muted/60">
              <span>{formatCurrency(minPrice)}</span>
              <span>ref. {formatCurrency(financial.estimatedSalePrice)}</span>
              <span>{formatCurrency(maxPrice)}</span>
            </div>
          </div>

          {/* Projeção de venda */}
          <div className="mt-6">
            <ColLabel>Projeção de venda</ColLabel>
            <div className="divide-y divide-polar-line">
              <FinRow label="Venda estimada"         value={formatCurrency(salePrice)} highlight />
              <FinRow label="Comissão agência (5%)"  value={formatCurrency(adj.agencyCommission)} neg />
              <FinRow label="IVA comissão (23%)"     value={formatCurrency(adj.agencyVAT)} neg />
              <FinRow label="IRS mais-valias"        value={formatCurrency(adj.capitalGainsTax)} neg />
              <FinRow label="Certificado energético" value={formatCurrency(adj.energyCertificate)} neg />
            </div>
            <div className="border-t border-polar-line mt-2 pt-2">
              <FinRow
                label="Lucro líquido"
                value={formatCurrency(adj.netProfit)}
                bold
                positive={adj.netProfit >= 0}
              />
            </div>
          </div>

          {/* Margin summary — updates with slider, inline styles for reliable color transitions */}
          {(() => {
            const [bg, border, numColor] =
              adj.netMargin >= 25 ? ['#f0fdf4', '#bbf7d0', '#16a34a'] :
              adj.netMargin >= 10 ? ['#fffbeb', '#fde68a', '#d97706'] :
                                    ['#fef2f2', '#fecaca', '#ef4444']
            return (
              <div
                className="mt-6 rounded-lg border p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                style={{ background: bg, borderColor: border, transition: 'background 0.3s, border-color 0.3s' }}
              >
                <div>
                  <div className="text-polar-ink text-sm font-medium">Margem líquida sobre investimento</div>
                  <div className="text-polar-ink-muted text-xs mt-0.5">
                    Lucro {formatCurrency(adj.netProfit)} · Investimento total {formatCurrency(financial.totalAcquisitionCost)}
                  </div>
                </div>
                <span
                  className="text-3xl font-bold"
                  style={{ color: numColor, transition: 'color 0.3s' }}
                >
                  {formatPercent(adj.netMargin)}
                </span>
              </div>
            )
          })()}

        </div>
      </section>

      {/* ── 4. VEREDICTO ── */}
      <section id="verdict">
        <SectionLabel icon={<Trophy size={13}/>}>Veredicto</SectionLabel>
        <div className={`rounded-xl border p-5 sm:p-7 ${cfg.bg} ${cfg.border}`}>
          {/* Header */}
          <div className="mb-5">
            <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg mb-3 ${cfg.badgeBg}`}>
              <span className="text-xl leading-none">{cfg.icon}</span>
              <span className={`text-lg font-bold tracking-wide ${cfg.badgeText}`}>{cfg.label}</span>
            </div>
            <div className="text-polar-ink-muted text-sm">
              Margem líquida:{' '}
              <span className={`font-semibold ${cfg.marginColor}`}>
                {formatPercent(financial.netMargin)}
              </span>
            </div>
          </div>

          {/* AI analysis */}
          <div className="space-y-3 border-t border-black/10 pt-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-polar-ink/80 text-[15px] leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. COMPARÁVEIS ── */}
      <section id="comparables">
        <SectionLabel icon={<Building2 size={13}/>}>Imóveis comparáveis · Imovirtual</SectionLabel>
        {comparables.length === 0 ? (
          <div className="card text-center py-12 text-polar-ink-muted">
            Nenhum comparável encontrado na zona
          </div>
        ) : (
          <div className="space-y-3">
            {comparables.map((c, i) => {
              const diff = marketStats.medianPricePerSqm > 0
                ? ((c.pricePerSqm - marketStats.medianPricePerSqm) / marketStats.medianPricePerSqm) * 100
                : 0
              const diffBadge = diff < -5
                ? 'text-emerald-700 bg-emerald-100'
                : diff > 5
                  ? 'text-red-600 bg-red-100'
                  : 'text-amber-700 bg-amber-100'

              // Days-on-market display
              const domLabel = c.daysOnMarket <= 0 ? null
                : c.daysOnMarket <= 1 ? 'Novo · 1 dia'
                : `${c.daysOnMarket} dias no mercado`
              const domColor = c.daysOnMarket <= 0 ? ''
                : c.daysOnMarket < 90  ? 'text-emerald-600'
                : c.daysOnMarket < 180 ? 'text-amber-600'
                :                        'text-red-500'

              // Diff badge
              const isBelow = diff < -5
              const isAboveMedian = diff > 5

              return (
                <div key={i} className="rounded-xl border border-polar-line bg-white p-4 hover:shadow-card-md transition-shadow">

                  {/* Top: location + diff badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs text-polar-ink-muted line-clamp-1">{c.location}</p>
                      <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                        <span className="text-xl font-bold text-polar-ink">{formatCurrency(c.price)}</span>
                        <span className="text-sm text-polar-ink-muted">{formatCurrency(c.pricePerSqm)}/m²</span>
                      </div>
                    </div>

                    {diff !== 0 && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] text-polar-ink-muted mb-1">vs. mediana da zona</div>
                        <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-xl ${diffBadge}`}>
                          {isBelow ? <TrendingDown size={13}/> : isAboveMedian ? <TrendingUp size={13}/> : null}
                          {Math.abs(diff).toFixed(0)}% {isBelow ? 'abaixo' : 'acima'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-polar-line my-3" />

                  {/* Specs + link */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-polar-ink-muted">
                      <span className="flex items-center gap-1"><Ruler size={11}/> {c.area} m²</span>
                      {domLabel && (
                        <span className={`flex items-center gap-1 font-medium ${domColor}`}>
                          <Clock size={11}/> {domLabel}
                        </span>
                      )}
                    </div>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-polar-purple border border-polar-purple/30 bg-polar-purple/5 hover:bg-polar-purple/10 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        Ver imóvel <ExternalLink size={11}/>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="h-8" />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-polar-ink-muted uppercase tracking-widest mb-4">
      <span className="opacity-60">{icon}</span>
      {children}
    </div>
  )
}

function ColLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold text-polar-ink-muted uppercase tracking-wider mb-3">
      {children}
    </div>
  )
}


function SignalCard({ label, value, valueColor, badge, description, footnote }: {
  label: string
  value: string
  valueColor: string
  badge: { label: string; className: string; icon?: React.ReactNode }
  description: string
  footnote: React.ReactNode
}) {
  return (
    <div className="flex gap-5 pt-5 first:pt-0 border-t border-polar-line first:border-0">
      {/* Left: metric */}
      <div className="w-36 flex-shrink-0">
        <div className="text-[10px] font-semibold text-polar-ink-muted uppercase tracking-wider mb-2">{label}</div>
        <div className={`text-4xl font-bold mb-3 ${valueColor}`}>{value}</div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>
          {badge.icon}{badge.label}
        </span>
      </div>
      {/* Divider */}
      <div className="w-px bg-polar-line flex-shrink-0" />
      {/* Right: explanation */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-polar-ink leading-relaxed mb-3">{description}</p>
        <p className="text-[10px] text-polar-ink-muted/70 leading-relaxed">{footnote}</p>
      </div>
    </div>
  )
}

function FinRow({ label, value, neg, bold, highlight, positive }: {
  label: string; value: string; neg?: boolean; bold?: boolean; highlight?: boolean; positive?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className={`text-sm ${bold ? 'font-semibold text-polar-ink' : 'text-polar-ink-muted'}`}>
        {label}
      </span>
      <span className={`text-sm font-medium ${
        highlight        ? 'text-polar-gold font-semibold' :
        positive === true  ? 'text-emerald-600 font-semibold' :
        positive === false ? 'text-red-500 font-semibold' :
        neg              ? 'text-polar-ink-muted' :
        bold             ? 'text-polar-ink font-semibold' :
                           'text-polar-ink'
      }`}>
        {neg ? '− ' : ''}{value}
      </span>
    </div>
  )
}
