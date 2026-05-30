import { useState, useMemo } from 'react'
import { ArrowLeft, ExternalLink, Clock, Ruler, TrendingDown, TrendingUp, Minus, Trophy, BarChart2, Calculator, Building2, MapPin, Info } from 'lucide-react'
import type { AnalysisResult, VerdictType } from '../lib/types'
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
  const priceDiff = marketStats.medianPricePerSqm > 0
    ? ((askingPricePerSqm - marketStats.medianPricePerSqm) / marketStats.medianPricePerSqm) * 100
    : 0

  const range = (marketStats.max - marketStats.min) || 1
  const propertyBarPos = Math.min(95, Math.max(5, ((askingPricePerSqm - marketStats.min) / range) * 100))
  const medianBarPos   = Math.min(95, Math.max(5, ((marketStats.medianPricePerSqm - marketStats.min) / range) * 100))

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
          {/* 3 price markers */}
          <div className="grid grid-cols-3 gap-4 mb-7">
            <PricePoint
              icon="🟢"
              label="Este imóvel"
              price={formatCurrency(property.askingPrice)}
              perSqm={`${formatCurrency(askingPricePerSqm)}/m²`}
              color="text-emerald-600"
              align="left"
            />
            <PricePoint
              icon="🟡"
              label="Preço justo de mercado"
              price={formatCurrency(Math.round(marketStats.medianPricePerSqm * property.area))}
              perSqm={`${formatCurrency(marketStats.medianPricePerSqm)}/m² mediana`}
              color="text-amber-600"
              align="center"
            />
            <PricePoint
              icon="🔴"
              label="Topo do mercado"
              price={formatCurrency(Math.round(marketStats.max * property.area))}
              perSqm={`${formatCurrency(marketStats.max)}/m² máximo`}
              color="text-red-500"
              align="right"
            />
          </div>

          {/* Gradient bar */}
          <div className="relative mb-10 mt-2">
            {/* The bar */}
            <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400">

              {/* Median line — white stripe on the gradient */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-5 bg-white/70 rounded-full"
                style={{ left: `${medianBarPos}%` }}
              />
            </div>

            {/* Property dot + label — sits on top, outside the bar div so opacity is independent */}
            <div
              className="absolute -translate-x-1/2"
              style={{ left: `${propertyBarPos}%`, top: '50%', transform: `translateX(-50%) translateY(-50%)` }}
            >
              {/* Label above */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 flex flex-col items-center pointer-events-none">
                <div className="bg-polar-ink text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow-sm whitespace-nowrap">
                  {formatCurrency(askingPricePerSqm)}/m²
                </div>
                <div className="w-1.5 h-1.5 bg-polar-ink rotate-45 -mt-[3px]" />
              </div>
              {/* White dot */}
              <div className="w-5 h-5 rounded-full bg-white border-2 border-polar-ink/20 shadow-md" />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-polar-ink-muted mb-2">
            <span className="hidden sm:inline">Mín {formatCurrency(marketStats.min)}/m²</span>
            <span className={`flex items-center gap-1 font-semibold text-sm ${
              isBelow ? 'text-emerald-600' : isAbove ? 'text-red-500' : 'text-amber-600'
            }`}>
              {isBelow ? <TrendingDown size={13}/> : isAbove ? <TrendingUp size={13}/> : <Minus size={13}/>}
              {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% vs. mediana
            </span>
            <span className="hidden sm:inline">Máx {formatCurrency(marketStats.max)}/m²</span>
          </div>
          <p className="text-xs text-polar-ink-muted/60 text-center">
            {comparables.length} imóveis activos na zona · máx. 18 meses no mercado
          </p>
        </div>
      </section>

      {/* ── 2. MERCADO LOCAL ── */}
      {comparables.length > 0 && (
        <section id="market">
          <SectionLabel icon={<MapPin size={13}/>}>Mercado local · Imovirtual</SectionLabel>
          <div className="card">

            {/* Three stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-5">
              <div>
                <div className="text-[10px] sm:text-xs text-polar-ink-muted mb-1">Mediana de oferta</div>
                <div className="text-lg sm:text-2xl font-bold text-polar-ink">
                  {formatCurrency(marketStats.medianPricePerSqm)}<span className="text-xs sm:text-sm font-normal text-polar-ink-muted">/m²</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] sm:text-xs text-polar-ink-muted mb-1">Intervalo</div>
                <div className="text-xs sm:text-sm font-semibold text-polar-ink">
                  {formatCurrency(marketStats.min)} – {formatCurrency(marketStats.max)}<span className="font-normal text-polar-ink-muted">/m²</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] sm:text-xs text-polar-ink-muted mb-1">Anúncios activos</div>
                <div className="text-lg sm:text-2xl font-bold text-polar-ink">{comparables.length}</div>
              </div>
            </div>

            {/* INE trend footnote — kept only as market momentum signal, not as pricing reference */}
            {ineData?.priceChangePct !== null && ineData && (
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-4 ${
                ineData.priceChangePct! > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                {ineData.priceChangePct! > 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                Mercado nacional {ineData.priceChangePct! > 0 ? '+' : ''}{ineData.priceChangePct!.toFixed(1)}% a.a. · INE {ineData.period}
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex gap-2 bg-polar-bg rounded-lg p-3 border border-polar-line">
              <Info size={13} className="text-polar-ink-muted/50 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] sm:text-xs text-polar-ink-muted/70 leading-relaxed">
                Preços de oferta activos no Imovirtual para tipologias próximas na área deste imóvel,
                com cobertura ao nível de freguesia ou concelho conforme a densidade de anúncios disponíveis.
                Reflectem valores pedidos, não preços de transacção efectiva — servem como referência de
                mercado e não como base exclusiva para decisão de investimento.
              </p>
            </div>

          </div>
        </section>
      )}

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

              return (
                <div key={i} className="rounded-xl border border-polar-line bg-white p-4 hover:shadow-card-md transition-shadow">
                  {/* Price row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-bold text-polar-ink">{formatCurrency(c.price)}</span>
                      <span className="text-xs text-polar-ink-muted">{formatCurrency(c.pricePerSqm)}/m²</span>
                    </div>
                    {diff !== 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${diffBadge}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="font-medium text-polar-ink text-sm leading-snug line-clamp-2 mb-1">{c.title}</p>

                  {/* Location */}
                  <p className="text-xs text-polar-ink-muted mb-3 line-clamp-1">{c.location}</p>

                  {/* Specs + link */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-xs text-polar-ink-muted">
                      <span className="flex items-center gap-1"><Ruler size={11}/> {c.area} m²</span>
                      {c.daysOnMarket > 0 && (
                        <span className="flex items-center gap-1"><Clock size={11}/> {c.daysOnMarket}d</span>
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

function PricePoint({ icon, label, price, perSqm, color, align = 'left' }: {
  icon: string; label: string; price: string; perSqm: string; color: string; align?: 'left' | 'center' | 'right'
}) {
  const alignClass = align === 'center' ? 'text-center items-center' : align === 'right' ? 'text-right items-end' : 'text-left items-start'
  return (
    <div className={`p-1.5 sm:p-4 flex flex-col ${alignClass}`}>
      <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-2">
        <span className="text-xs sm:text-sm leading-none">{icon}</span>
        <span className="text-[9px] sm:text-xs text-polar-ink-muted leading-tight">{label}</span>
      </div>
      <div className={`font-bold mb-0.5 ${color} ${align === 'center' ? 'text-sm sm:text-2xl' : 'text-xs sm:text-xl'}`}>{price}</div>
      <div className="text-[9px] sm:text-xs text-polar-ink-muted leading-snug">{perSqm}</div>
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
