import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react'
import { formatCurrency } from '../lib/financial'
import { loadMarketData, getCachedMarketData } from '../lib/marketData'
import type { RegionData, MarketData } from '../lib/marketData'
import PortugalMap from './PortugalMap'

// ─── Custom tooltip ───────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-polar-ink text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white/70">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}/m²</span>
        </div>
      ))}
    </div>
  )
}

// deno-lint-ignore no-explicit-any
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d: RegionData = payload[0]?.payload
  return (
    <div className="bg-polar-ink text-white text-xs px-3 py-2.5 rounded-lg shadow-lg min-w-[160px]">
      <div className="font-semibold mb-2">{label}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-white/60">Mediana</span>
          <span className="font-medium">{formatCurrency(d?.median)}/m²</span>
        </div>
        {d?.medianNew > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-white/60">Novos</span>
            <span className="font-medium">{formatCurrency(d?.medianNew)}/m²</span>
          </div>
        )}
        {d?.medianExisting > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-white/60">Existentes</span>
            <span className="font-medium">{formatCurrency(d?.medianExisting)}/m²</span>
          </div>
        )}
        {d?.yoy !== null && d?.yoy !== undefined && (
          <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
            <span className="text-white/60">YoY</span>
            <span className={`font-semibold ${d.yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {d.yoy > 0 ? '+' : ''}{d.yoy}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-polar-line rounded-lg ${className}`} />
}

function KpiSkeleton() {
  return (
    <div className="card flex flex-col gap-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketTrendsView() {
  // Seed from cache so revisiting the tab renders instantly (no spinner).
  const cached = getCachedMarketData()
  const [data, setData] = useState<MarketData | null>(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  async function load(force = false) {
    if (force || !data) setLoading(true)
    setError(null)
    try {
      const md = await loadMarketData(force)
      setData(md)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // On mount, resolve from cache (instant) or fetch if empty/stale.
  useEffect(() => { load() }, [])

  // ── Colour helper: green → amber → red based on value vs national median ──
  function barColor(median: number, national: number): string {
    if (median >= national * 1.2) return '#c084fc'  // purple — premium
    if (median >= national * 1.05) return '#f59e0b' // amber — above market
    if (median <= national * 0.85) return '#6ee7b7' // mint — below market
    return '#a78bfa'                                 // base violet
  }


  // Exclude national/Continente from regional chart (too broad)
  const chartRegions = data?.regions.filter(r => !['PT', '1'].includes(r.code)) ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-polar-ink">Tendências de Mercado</h2>
          <p className="text-sm text-polar-ink-muted mt-1">
            Estatísticas de preços da habitação · Fonte: INE Portugal
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {data && (
            <span className="text-xs text-polar-ink-muted/60">{data.latestPeriod}</span>
          )}
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-polar-ink-muted hover:text-polar-ink border border-polar-line rounded-lg px-3 py-1.5 hover:bg-polar-bg transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : data ? (
          <>
            <KpiCard
              label="Mediana nacional"
              value={`${formatCurrency(data.national.median)}/m²`}
              sub={data.latestPeriod}
              trend={data.national.yoy}
            />
            <KpiCard
              label="Variação anual"
              value={`${data.national.yoy !== null && data.national.yoy > 0 ? '+' : ''}${data.national.yoy?.toFixed(1) ?? '–'}%`}
              sub="vs. ano anterior"
              positive={data.national.yoy !== null ? data.national.yoy > 0 : undefined}
            />
            <KpiCard
              label="Região mais cara"
              value={`${formatCurrency(data.regions[0]?.median)}/m²`}
              sub={data.regions[0]?.name}
              accent
            />
            <KpiCard
              label="Imóveis novos"
              value={`${formatCurrency(data.national.medianNew)}/m²`}
              sub={`+${Math.round(((data.national.medianNew - data.national.medianExisting) / data.national.medianExisting) * 100)}% vs. existentes`}
            />
          </>
        ) : null}
      </div>

      {/* ── District map ── */}
      <section>
        <SectionTitle>Mapa de preços por distrito · {data?.latestPeriod ?? '–'}</SectionTitle>
        <div className="card">
          {loading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : data ? (
            <PortugalMap
              regions={data.regions}
              nationalMedian={data.national.median}
              latestPeriod={data.latestPeriod}
            />
          ) : null}
        </div>
      </section>

      {/* ── National price trend ── */}
      <section>
        <SectionTitle>Evolução do preço mediano · Portugal</SectionTitle>
        <div className="card pt-2">
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : data?.trend.length ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#9c9185' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9c9185' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
                    domain={['auto', 'auto']}
                    width={38}
                  />
                  <Tooltip content={<PriceTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="median"
                    name="Total"
                    stroke="#a78bfa"
                    strokeWidth={2.5}
                    fill="url(#totalGrad)"
                    dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#a78bfa' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="medianNew"
                    name="Novos"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="url(#newGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-2 pl-2">
                <Legend color="#a78bfa" label="Mediana total" />
                <Legend color="#f59e0b" label="Imóveis novos" dashed />
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* ── Regional comparison ── */}
      <section>
        <SectionTitle>Preço mediano por região · {data?.latestPeriod ?? '–'}</SectionTitle>
        <div className="card pt-2">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : chartRegions.length ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(300, chartRegions.length * 40)}>
                <BarChart
                  layout="vertical"
                  data={chartRegions}
                  margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
                  barSize={16}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0ece6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9c9185' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${formatCurrency(v)}`}
                    domain={[0, 'dataMax + 300']}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6b6355' }}
                    axisLine={false} tickLine={false}
                    width={145}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: '#f0ece640' }} />
                  {data && (
                    <ReferenceLine
                      x={data.national.median}
                      stroke="#a78bfa"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{ value: 'Nacional', position: 'top', fontSize: 10, fill: '#a78bfa' }}
                    />
                  )}
                  <Bar dataKey="median" name="Mediana" radius={[0, 4, 4, 0]}>
                    {chartRegions.map((r) => (
                      <Cell
                        key={r.code}
                        fill={data ? barColor(r.median, data.national.median) : '#a78bfa'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pl-2 border-t border-polar-line pt-3">
                <Legend color="#c084fc" label="Acima +20% da mediana nacional" />
                <Legend color="#f59e0b" label="Acima +5%" />
                <Legend color="#a78bfa" label="Na média" />
                <Legend color="#6ee7b7" label="Abaixo −15%" />
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* ── New vs Existing by region ── */}
      <section>
        <SectionTitle>Imóveis novos vs. existentes · {data?.latestPeriod ?? '–'}</SectionTitle>
        <div className="card pt-2">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartRegions.filter(r => r.medianNew > 0).length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartRegions.filter(r => r.medianNew > 0 && r.medianExisting > 0)}
                margin={{ top: 8, right: 10, left: 0, bottom: 20 }}
                barGap={2}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#9c9185' }}
                  axisLine={false} tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={55}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9c9185' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${formatCurrency(v)}`}
                  width={52}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: '#f0ece640' }} />
                <Bar dataKey="medianNew" name="Novos" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="medianExisting" name="Existentes" fill="#a78bfa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-sm text-polar-ink-muted">Sem dados suficientes</div>}
          {!loading && (
            <div className="flex items-center gap-5 mt-1 pl-2">
              <Legend color="#f59e0b" label="Imóveis novos" />
              <Legend color="#a78bfa" label="Imóveis existentes" />
            </div>
          )}
        </div>
      </section>

      {/* ── Data table ── */}
      <section>
        <SectionTitle>Tabela de regiões · {data?.latestPeriod ?? '–'}</SectionTitle>
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : data ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-polar-line bg-polar-bg">
                  <th className="text-left text-xs font-semibold text-polar-ink-muted uppercase tracking-wider px-5 py-3">Região</th>
                  <th className="text-right text-xs font-semibold text-polar-ink-muted uppercase tracking-wider px-4 py-3">Total</th>
                  <th className="text-right text-xs font-semibold text-polar-ink-muted uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Novos</th>
                  <th className="text-right text-xs font-semibold text-polar-ink-muted uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Existentes</th>
                  <th className="text-right text-xs font-semibold text-polar-ink-muted uppercase tracking-wider px-5 py-3">YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-polar-line">
                {data.regions.map((r) => (
                  <tr key={r.code} className="hover:bg-polar-bg/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-polar-ink">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          ['PT', '1'].includes(r.code) ? 'bg-polar-ink-muted' : 'bg-polar-gold'
                        }`} />
                        {r.name}
                        {['PT', '1'].includes(r.code) && (
                          <span className="text-[10px] text-polar-ink-muted/60 font-normal">(ref.)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-polar-ink">
                      {formatCurrency(r.median)}/m²
                    </td>
                    <td className="px-4 py-3 text-right text-polar-ink-muted hidden sm:table-cell">
                      {r.medianNew > 0 ? `${formatCurrency(r.medianNew)}/m²` : '–'}
                    </td>
                    <td className="px-4 py-3 text-right text-polar-ink-muted hidden sm:table-cell">
                      {r.medianExisting > 0 ? `${formatCurrency(r.medianExisting)}/m²` : '–'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.yoy !== null ? (
                        <span className={`inline-flex items-center gap-0.5 font-semibold text-xs ${
                          r.yoy > 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {r.yoy > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {r.yoy > 0 ? '+' : ''}{r.yoy}%
                        </span>
                      ) : (
                        <span className="text-polar-ink-muted/40 text-xs">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>

      {/* ── Source ── */}
      <p className="text-[10px] text-polar-ink-muted/50 text-center pb-4">
        Fonte: INE — Estatísticas de Preços da Habitação ao Nível Local (Metodologia 2022) · Indicador 0012234 · Trimestral ·
        Cobertura por região, sub-região (NUTS III) e principais concelhos. Valores do mapa por distrito aproximados à sub-região NUTS III dominante.
      </p>

    </div>
  )
}

// ─── Small components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, positive, accent }: {
  label: string
  value: string
  sub?: string
  trend?: number | null
  positive?: boolean
  accent?: boolean
}) {
  return (
    <div className="card flex flex-col gap-1.5">
      <div className="text-[10px] sm:text-xs font-medium text-polar-ink-muted uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-lg sm:text-2xl font-bold ${accent ? 'text-polar-gold' : 'text-polar-ink'}`}>
        {value}
      </div>
      <div className="flex items-center gap-1.5">
        {trend !== null && trend !== undefined ? (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${
            trend > 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}% a.a.
          </span>
        ) : sub ? (
          <span className={`text-xs ${
            positive === true ? 'text-emerald-600 font-medium' :
            positive === false ? 'text-red-500 font-medium' :
            'text-polar-ink-muted'
          }`}>{sub}</span>
        ) : null}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-polar-ink-muted uppercase tracking-widest mb-4">
      {children}
    </h3>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-4 h-0.5"
        style={{
          backgroundColor: dashed ? 'transparent' : color,
          backgroundImage: dashed ? `repeating-linear-gradient(to right, ${color} 0, ${color} 4px, transparent 4px, transparent 7px)` : undefined,
        }}
      />
      <span className="text-[10px] text-polar-ink-muted">{label}</span>
    </div>
  )
}
