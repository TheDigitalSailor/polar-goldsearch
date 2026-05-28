import { ArrowLeft, ExternalLink, Clock, Ruler, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { AnalysisResult, VerdictType } from '../lib/types'
import { formatCurrency, formatPercent } from '../lib/financial'

interface Props {
  result: AnalysisResult
  onBack: () => void
}

const verdictConfig: Record<VerdictType, {
  icon: string; label: string; textColor: string; bg: string; border: string; marginColor: string
}> = {
  excellent:   { icon: '🚀', label: 'Excelente',      textColor: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  marginColor: 'text-indigo-600'  },
  investigate: { icon: '✅', label: 'Investigar',     textColor: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', marginColor: 'text-emerald-600' },
  grey_zone:   { icon: '⚠️', label: 'Zona cinzenta', textColor: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   marginColor: 'text-amber-600'   },
  pass:        { icon: '❌', label: 'Passar',         textColor: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     marginColor: 'text-red-600'     },
}

export default function ResultsView({ result, onBack }: Props) {
  const { property, comparables, marketStats, financial, verdict, aiAnalysis } = result
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
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-7">

      {/* ── Top bar ── */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-polar-ink-muted hover:text-polar-ink transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Nova análise
        </button>
        <h2 className="text-2xl font-semibold text-polar-ink leading-tight">
          {property.address}
        </h2>
        <p className="text-sm text-polar-ink-muted mt-1.5">
          {property.typology} · {property.area} m² · {formatCurrency(property.askingPrice)} pedido
        </p>
      </div>

      {/* ── 1. POSICIONAMENTO DE PREÇO ── */}
      <section id="price">
        <SectionLabel>Posicionamento de preço</SectionLabel>
        <div className="card">
          {/* 3 price markers */}
          <div className="grid grid-cols-3 gap-4 mb-7">
            <PricePoint
              icon="🟢"
              label="Este imóvel"
              price={formatCurrency(property.askingPrice)}
              perSqm={`${formatCurrency(askingPricePerSqm)}/m²`}
              color="text-emerald-600"
            />
            <PricePoint
              icon="🟡"
              label="Preço justo de mercado"
              price={formatCurrency(Math.round(marketStats.medianPricePerSqm * property.area))}
              perSqm={`${formatCurrency(marketStats.medianPricePerSqm)}/m² mediana`}
              color="text-amber-600"
              highlight
            />
            <PricePoint
              icon="🔴"
              label="Topo do mercado"
              price={formatCurrency(Math.round(marketStats.max * property.area))}
              perSqm={`${formatCurrency(marketStats.max)}/m² máximo`}
              color="text-red-500"
            />
          </div>

          {/* Gradient bar */}
          <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 mb-7 opacity-80">
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-px"
              style={{ left: `${medianBarPos}%` }}
            >
              <div className="w-px h-6 bg-polar-ink/25 -translate-y-2" />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${propertyBarPos}%` }}
            >
              <div className="w-5 h-5 rounded-full bg-polar-gold border-2 border-white shadow-md -translate-y-1" />
            </div>
          </div>

          <div className="flex justify-between text-xs text-polar-ink-muted mb-2">
            <span>Mín {formatCurrency(marketStats.min)}/m²</span>
            <span className={`flex items-center gap-1 font-semibold text-sm ${
              isBelow ? 'text-emerald-600' : isAbove ? 'text-red-500' : 'text-amber-600'
            }`}>
              {isBelow ? <TrendingDown size={13}/> : isAbove ? <TrendingUp size={13}/> : <Minus size={13}/>}
              {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% vs. mediana de mercado
            </span>
            <span>Máx {formatCurrency(marketStats.max)}/m²</span>
          </div>
          <p className="text-xs text-polar-ink-muted/60 text-center">
            {comparables.length} imóveis activos na zona · máx. 18 meses no mercado
          </p>
        </div>
      </section>

      {/* ── 2. ANÁLISE FINANCEIRA ── */}
      <section id="financial">
        <SectionLabel>Análise financeira</SectionLabel>
        <div className="card">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <ColLabel>Custos de compra</ColLabel>
              <FinRow label="Preço de compra"        value={formatCurrency(financial.purchasePrice)} />
              <FinRow label={`IMT (${formatPercent((financial.imt / financial.purchasePrice) * 100)})`} value={formatCurrency(financial.imt)} neg />
              <FinRow label="Imposto de Selo (0.8%)" value={formatCurrency(financial.stampDuty)} neg />
              <FinRow label="Escritura e registos"   value={formatCurrency(financial.notaryFees)} neg />
              {financial.renovationCost > 0 &&
                <FinRow label="Obras"                value={formatCurrency(financial.renovationCost)} neg />}
              <div className="border-t border-polar-line mt-3 pt-3">
                <FinRow label="Total investido" value={formatCurrency(financial.totalAcquisitionCost)} bold />
              </div>
            </div>

            <div>
              <ColLabel>Projecção de venda</ColLabel>
              <FinRow label="Venda estimada"         value={formatCurrency(financial.estimatedSalePrice)} highlight />
              <FinRow label="Comissão agência (5%)"  value={formatCurrency(financial.agencyCommission)} neg />
              <FinRow label="IVA comissão (23%)"     value={formatCurrency(financial.agencyVAT)} neg />
              <FinRow label="IRS mais-valias"        value={formatCurrency(financial.capitalGainsTax)} neg />
              <FinRow label="Certificado energético" value={formatCurrency(financial.energyCertificate)} neg />
              <div className="border-t border-polar-line mt-3 pt-3">
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
          <div className={`mt-6 rounded-xl p-4 flex items-center justify-between ${
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

      {/* ── 3. VEREDICTO ── */}
      <section id="verdict">
        <SectionLabel>Veredicto</SectionLabel>
        <div className={`rounded-2xl border p-7 ${cfg.bg} ${cfg.border}`}>
          {/* Header */}
          <div className="mb-5 flex items-start gap-4">
            <div className="text-3xl leading-none mt-0.5">{cfg.icon}</div>
            <div>
              <div className={`font-display text-3xl leading-none ${cfg.textColor}`}>{cfg.label}</div>
              <div className="text-polar-ink-muted text-sm mt-1.5">
                Margem líquida:{' '}
                <span className={`font-semibold ${cfg.marginColor}`}>
                  {formatPercent(financial.netMargin)}
                </span>
              </div>
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

      {/* ── 4. COMPARÁVEIS ── */}
      <section id="comparables">
        <SectionLabel>Imóveis comparáveis activos</SectionLabel>
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
                <div key={i} className="card flex items-center gap-5 hover:shadow-card-md transition-shadow">
                  {/* Image placeholder */}
                  <div className="w-24 h-20 rounded-xl flex-shrink-0 bg-polar-sand border border-polar-line flex items-center justify-center">
                    <span className="text-3xl opacity-30">🏠</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-polar-ink text-sm line-clamp-1 mb-1">{c.title}</p>
                    <p className="text-xs text-polar-ink-muted mb-2">{c.location}</p>
                    <div className="flex items-center gap-3 text-xs text-polar-ink-muted">
                      <span className="flex items-center gap-1"><Ruler size={11}/> {c.area} m²</span>
                      <span className="flex items-center gap-1"><Clock size={11}/> {c.daysOnMarket}d no mercado</span>
                    </div>
                  </div>

                  {/* Price + badge */}
                  <div className="text-right flex-shrink-0 space-y-1.5">
                    <div className="text-lg font-bold text-polar-ink">{formatCurrency(c.price)}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diffBadge}`}>
                      {formatCurrency(c.pricePerSqm)}/m²
                      {diff !== 0 && ` (${diff > 0 ? '+' : ''}${diff.toFixed(0)}%)`}
                    </span>
                  </div>

                  {/* Ver imóvel */}
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-polar-purple border border-polar-purple/25 hover:bg-polar-purple/5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Ver imóvel <ExternalLink size={11}/>
                    </a>
                  )}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-polar-purple/60 uppercase tracking-widest mb-3 ml-0.5">
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

function PricePoint({ icon, label, price, perSqm, color, highlight }: {
  icon: string; label: string; price: string; perSqm: string; color: string; highlight?: boolean
}) {
  return (
    <div className={`p-4 rounded-xl ${highlight ? 'bg-polar-sand border border-polar-line' : ''}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-polar-ink-muted">{label}</span>
      </div>
      <div className={`text-xl font-bold mb-0.5 ${color}`}>{price}</div>
      <div className="text-xs text-polar-ink-muted">{perSqm}</div>
    </div>
  )
}

function FinRow({ label, value, neg, bold, highlight, positive }: {
  label: string; value: string; neg?: boolean; bold?: boolean; highlight?: boolean; positive?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-polar-line last:border-0">
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
