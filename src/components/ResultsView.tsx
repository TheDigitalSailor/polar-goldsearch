import { ArrowLeft, ExternalLink, Clock, Ruler, TrendingDown, TrendingUp, Minus, Trophy, BarChart2, Calculator, Building2, Database } from 'lucide-react'
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
  excellent:   { icon: '🚀', label: 'Excelente oportunidade', textColor: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  marginColor: 'text-indigo-600',  badgeBg: 'bg-indigo-100',  badgeText: 'text-indigo-800'  },
  investigate: { icon: '✅', label: 'Merece investigar',     textColor: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', marginColor: 'text-emerald-600', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800' },
  grey_zone:   { icon: '⚠️', label: 'Zona cinzenta',        textColor: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   marginColor: 'text-amber-600',   badgeBg: 'bg-amber-100',   badgeText: 'text-amber-800'   },
  pass:        { icon: '❌', label: 'Mau negócio',           textColor: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     marginColor: 'text-red-600',     badgeBg: 'bg-red-100',     badgeText: 'text-red-800'     },
}

export default function ResultsView({ result, onBack }: Props) {
  const { property, comparables, marketStats, ineData, financial, verdict, aiAnalysis } = result
  const cfg = verdictConfig[verdict]

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

      {/* ── 2. INE MARKET DATA ── */}
      {ineData && (
        <section id="ine">
          <SectionLabel icon={<Database size={13}/>}>Mercado real · INE</SectionLabel>
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Main stat */}
              <div>
                <div className="text-xs text-polar-ink-muted mb-1">
                  Mediana das vendas reais · {ineData.region}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-polar-ink">
                    {formatCurrency(ineData.medianPricePerSqm)}/m²
                  </span>
                  {ineData.priceChangePct !== null && (
                    <span className={`flex items-center gap-0.5 text-sm font-semibold ${
                      ineData.priceChangePct > 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {ineData.priceChangePct > 0
                        ? <TrendingUp size={13}/>
                        : <TrendingDown size={13}/>}
                      {ineData.priceChangePct > 0 ? '+' : ''}
                      {ineData.priceChangePct.toFixed(1)}% vs. ano ant.
                    </span>
                  )}
                </div>
                <div className="text-xs text-polar-ink-muted mt-1">
                  Baseado em transações reais · {ineData.period}
                </div>
              </div>
              {/* Context badge */}
              <div className="flex-shrink-0 sm:text-right">
                <div className="inline-flex flex-col items-end gap-1">
                  <div className="text-xs text-polar-ink-muted">Preço pedido neste imóvel</div>
                  <div className={`text-base font-semibold ${
                    property.askingPrice / property.area > ineData.medianPricePerSqm * 1.05
                      ? 'text-red-500'
                      : property.askingPrice / property.area < ineData.medianPricePerSqm * 0.95
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                  }`}>
                    {formatCurrency(Math.round(property.askingPrice / property.area))}/m²
                    {' '}
                    ({property.askingPrice / property.area > ineData.medianPricePerSqm
                      ? '+' : ''}
                    {(((property.askingPrice / property.area) - ineData.medianPricePerSqm) / ineData.medianPricePerSqm * 100).toFixed(0)}% INE)
                  </div>
                  <div className="text-[10px] text-polar-ink-muted/60">
                    Fonte: INE — Estatísticas de Preços da Habitação
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. ANÁLISE FINANCEIRA ── */}
      <section id="financial">
        <SectionLabel icon={<Calculator size={13}/>}>Análise financeira</SectionLabel>
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <ColLabel>Custos de compra</ColLabel>
              <div className="divide-y divide-polar-line">
                <FinRow label="Preço de compra"        value={formatCurrency(financial.purchasePrice)} />
                <FinRow label={`IMT (${formatPercent((financial.imt / financial.purchasePrice) * 100)})`} value={formatCurrency(financial.imt)} neg />
                <FinRow label="Imposto de Selo (0.8%)" value={formatCurrency(financial.stampDuty)} neg />
                <FinRow label="Escritura e registos"   value={formatCurrency(financial.notaryFees)} neg />
                {financial.renovationCost > 0 &&
                  <FinRow label="Obras"                value={formatCurrency(financial.renovationCost)} neg />}
              </div>
              <div className="border-t border-polar-line mt-2 pt-2">
                <FinRow label="Total investido" value={formatCurrency(financial.totalAcquisitionCost)} bold />
              </div>
            </div>

            <div>
              <ColLabel>Projecção de venda</ColLabel>
              <div className="divide-y divide-polar-line">
                <FinRow label="Venda estimada"         value={formatCurrency(financial.estimatedSalePrice)} highlight />
                <FinRow label="Comissão agência (5%)"  value={formatCurrency(financial.agencyCommission)} neg />
                <FinRow label="IVA comissão (23%)"     value={formatCurrency(financial.agencyVAT)} neg />
                <FinRow label="IRS mais-valias"        value={formatCurrency(financial.capitalGainsTax)} neg />
                <FinRow label="Certificado energético" value={formatCurrency(financial.energyCertificate)} neg />
              </div>
              <div className="border-t border-polar-line mt-2 pt-2">
                <FinRow
                  label="Lucro líquido"
                  value={formatCurrency(financial.netProfit)}
                  bold
                  positive={financial.netProfit >= 0}
                />
              </div>
            </div>
          </div>

          {/* Margin summary */}
          <div className={`mt-6 rounded-lg p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
            financial.netMargin >= 20 ? 'bg-emerald-50 border border-emerald-200' :
            financial.netMargin >= 15 ? 'bg-amber-50 border border-amber-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <div>
              <div className="text-polar-ink text-sm font-medium">Margem líquida sobre investimento</div>
              <div className="text-polar-ink-muted text-xs mt-0.5">
                Lucro {formatCurrency(financial.netProfit)} · Investimento total {formatCurrency(financial.totalAcquisitionCost)}
              </div>
            </div>
            <span className={`text-3xl font-bold ${
              financial.netMargin >= 20 ? 'text-emerald-600' :
              financial.netMargin >= 15 ? 'text-amber-600' : 'text-red-500'
            }`}>{formatPercent(financial.netMargin)}</span>
          </div>
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-polar-purple hover:underline flex-shrink-0"
                      >
                        Ver <ExternalLink size={10}/>
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
