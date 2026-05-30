import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { GeographyShape } from 'react-simple-maps'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../lib/financial'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegionData {
  code: string
  name: string
  group: string
  median: number
  medianNew: number
  medianExisting: number
  yoy: number | null
}

interface Props {
  regions: RegionData[]
  nationalMedian: number
  latestPeriod: string
}

// GADM district name → best-matching INE NUTS III region / area code.
// Districts don't map 1:1 to NUTS III, so each district uses its dominant
// sub-region as a representative reference value.
const DISTRICT_TO_INE: Record<string, string> = {
  Aveiro:          '191',  // Região de Aveiro
  Beja:            '1C2',  // Baixo Alentejo
  Braga:           '112',  // Cávado
  'Bragança':      '11E',  // Terras de Trás-os-Montes
  CasteloBranco:   '195',  // Beira Baixa
  Coimbra:         '192',  // Região de Coimbra
  'Évora':         '1C4',  // Alentejo Central
  Faro:            '15',   // Algarve
  Guarda:          '196',  // Beiras e Serra da Estrela
  Leiria:          '193',  // Região de Leiria
  Lisboa:          '1A',   // Grande Lisboa
  Portalegre:      '1C3',  // Alto Alentejo
  Porto:           '11A',  // A.M. do Porto
  'Santarém':      '1D3',  // Lezíria do Tejo
  'Setúbal':       '1B',   // Península de Setúbal
  VianadoCastelo:  '111',  // Alto Minho
  VilaReal:        '11D',  // Douro
  Viseu:           '194',  // Viseu Dão Lafões
  Madeira:         '3',    // R.A. Madeira
  Azores:          '2',    // R.A. Açores
}

// Friendly Portuguese label per district
const DISTRICT_LABEL: Record<string, string> = {
  Aveiro: 'Aveiro', Beja: 'Beja', Braga: 'Braga', 'Bragança': 'Bragança',
  CasteloBranco: 'Castelo Branco', Coimbra: 'Coimbra', 'Évora': 'Évora',
  Faro: 'Faro', Guarda: 'Guarda', Leiria: 'Leiria', Lisboa: 'Lisboa',
  Portalegre: 'Portalegre', Porto: 'Porto', 'Santarém': 'Santarém',
  'Setúbal': 'Setúbal', VianadoCastelo: 'Viana do Castelo', VilaReal: 'Vila Real',
  Viseu: 'Viseu', Madeira: 'Madeira', Azores: 'Açores',
}

const ISLAND_NAMES = new Set(['Madeira', 'Azores'])

// ─── Colour scale ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

const SCALE_LOW = '#ede9fe'   // light violet
const SCALE_MID = '#a78bfa'   // polar violet
const SCALE_HIGH = '#6d28d9'  // deep purple
const NO_DATA = '#ece7e0'

function colorFor(value: number, min: number, max: number): string {
  if (!value || max <= min) return NO_DATA
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return t < 0.5 ? lerpColor(SCALE_LOW, SCALE_MID, t * 2) : lerpColor(SCALE_MID, SCALE_HIGH, (t - 0.5) * 2)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Hover {
  district: string
  region?: RegionData
  x: number
  y: number
}

export default function PortugalMap({ regions, nationalMedian, latestPeriod }: Props) {
  const [hover, setHover] = useState<Hover | null>(null)

  const byCode = new Map(regions.map(r => [r.code, r]))

  function regionFor(districtName: string): RegionData | undefined {
    const code = DISTRICT_TO_INE[districtName]
    return code ? byCode.get(code) : undefined
  }

  // Colour scale bounds from mainland districts only (islands shown separately)
  const mainlandValues = Object.keys(DISTRICT_TO_INE)
    .filter(d => !ISLAND_NAMES.has(d))
    .map(d => regionFor(d)?.median ?? 0)
    .filter(v => v > 0)
  const min = mainlandValues.length ? Math.min(...mainlandValues) : 0
  const max = mainlandValues.length ? Math.max(...mainlandValues) : 1

  const islands = (['Madeira', 'Azores'] as const)
    .map(name => ({ name, label: DISTRICT_LABEL[name], region: regionFor(name) }))
    .filter(i => i.region)

  return (
    <div className="relative">
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">

        {/* ── Map ── */}
        <div className="relative">
          {/* maxWidth derived from the 420:560 aspect ratio so height never
              exceeds the viewport: 72vh * (420/560) = 54vh */}
          <div className="mx-auto" style={{ width: '100%', maxWidth: 'min(480px, 54vh)' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [-8.0, 39.6], scale: 4300 }}
            width={420}
            height={560}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <Geographies geography="/portugal-districts.geojson">
              {({ geographies }) =>
                geographies
                  .filter((geo: GeographyShape) => !ISLAND_NAMES.has(geo.properties.name as string))
                  .map((geo: GeographyShape) => {
                    const name = geo.properties.name as string
                    const region = regionFor(name)
                    const fill = colorFor(region?.median ?? 0, min, max)
                    const isHovered = hover?.district === name
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke="#ffffff"
                        strokeWidth={0.75}
                        onMouseEnter={(e: React.MouseEvent) =>
                          setHover({ district: name, region, x: e.clientX, y: e.clientY })
                        }
                        onMouseMove={(e: React.MouseEvent) =>
                          setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)
                        }
                        onMouseLeave={() => setHover(null)}
                        style={{
                          default: { outline: 'none', cursor: 'pointer', transition: 'fill 0.15s' },
                          hover: { outline: 'none', fill: '#c084fc', cursor: 'pointer' },
                          pressed: { outline: 'none' },
                        }}
                        opacity={isHovered ? 0.92 : 1}
                      />
                    )
                  })
              }
            </Geographies>
          </ComposableMap>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 px-1">
            <span className="text-[10px] text-polar-ink-muted whitespace-nowrap">{formatCurrency(min)}/m²</span>
            <div
              className="h-2 flex-1 rounded-full"
              style={{ background: `linear-gradient(to right, ${SCALE_LOW}, ${SCALE_MID}, ${SCALE_HIGH})` }}
            />
            <span className="text-[10px] text-polar-ink-muted whitespace-nowrap">{formatCurrency(max)}/m²</span>
          </div>
          </div>
        </div>

        {/* ── Islands (geographically distant — shown as cards) ── */}
        <div className="flex md:flex-col gap-3 md:w-44">
          {islands.map(({ name, label, region }) => (
            <div
              key={name}
              className="flex-1 rounded-xl border border-polar-line p-3 bg-polar-bg/40"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: colorFor(region!.median, min, max) }}
                />
                <span className="text-xs font-semibold text-polar-ink">{label}</span>
              </div>
              <div className="text-base font-bold text-polar-ink">{formatCurrency(region!.median)}/m²</div>
              {region!.yoy !== null && (
                <div className={`flex items-center gap-0.5 text-[11px] font-semibold mt-0.5 ${
                  region!.yoy >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {region!.yoy >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {region!.yoy > 0 ? '+' : ''}{region!.yoy}% a.a.
                </div>
              )}
            </div>
          ))}
          <p className="hidden md:block text-[10px] text-polar-ink-muted/60 leading-snug mt-1">
            Valores por distrito aproximados à sub-região NUTS III dominante. Passe o cursor sobre o mapa para detalhes.
          </p>
        </div>
      </div>

      {/* ── Tooltip ── */}
      {hover && (
        <div
          className="fixed z-50 pointer-events-none bg-polar-ink text-white text-xs px-3 py-2.5 rounded-lg shadow-xl min-w-[160px]"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="font-semibold mb-1.5">{DISTRICT_LABEL[hover.district] ?? hover.district}</div>
          {hover.region ? (
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-white/60">Mediana</span>
                <span className="font-medium">{formatCurrency(hover.region.median)}/m²</span>
              </div>
              {hover.region.medianNew > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">Novos</span>
                  <span className="font-medium">{formatCurrency(hover.region.medianNew)}/m²</span>
                </div>
              )}
              {hover.region.medianExisting > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">Existentes</span>
                  <span className="font-medium">{formatCurrency(hover.region.medianExisting)}/m²</span>
                </div>
              )}
              {hover.region.yoy !== null && (
                <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
                  <span className="text-white/60">Variação anual</span>
                  <span className={`font-semibold ${hover.region.yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {hover.region.yoy > 0 ? '+' : ''}{hover.region.yoy}%
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
                <span className="text-white/60">vs. nacional</span>
                <span className="font-medium">
                  {hover.region.median >= nationalMedian ? '+' : ''}
                  {Math.round(((hover.region.median - nationalMedian) / nationalMedian) * 100)}%
                </span>
              </div>
              <div className="text-[10px] text-white/40 pt-1">{hover.region.name} · {latestPeriod}</div>
            </div>
          ) : (
            <div className="text-white/50">Sem dados disponíveis</div>
          )}
        </div>
      )}
    </div>
  )
}
