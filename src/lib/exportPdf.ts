import { jsPDF } from 'jspdf'
import type { AnalysisResult } from './types'
import { formatCurrency } from './financial'

// ── Brand colours ────────────────────────────────────────────────────────────
type RGB = [number, number, number]
const C = {
  purple:  [74,  25,  66]  as RGB,
  gold:    [201, 169, 110] as RGB,
  ink:     [26,  22,  18]  as RGB,
  muted:   [122, 112, 104] as RGB,
  line:    [228, 223, 216] as RGB,
  sand:    [246, 243, 239] as RGB,
  white:   [255, 255, 255] as RGB,
  emerald: [5,   150, 105] as RGB,
  amber:   [161, 98,  7]   as RGB,
  red:     [220, 38,  38]  as RGB,
  blue:    [37,  99,  235] as RGB,
}

// ── A4 layout constants ──────────────────────────────────────────────────────
const PW = 210, PH = 297
const ML = 18, MR = 18
const CW = PW - ML - MR   // 174 mm

function verdictColor(v: string): RGB {
  if (v === 'excellent')   return C.emerald
  if (v === 'investigate') return [101, 163, 13]
  if (v === 'grey_zone')   return C.amber
  return C.red
}
function verdictLabel(v: string): string {
  if (v === 'excellent')   return 'Excelente oportunidade'
  if (v === 'investigate') return 'Merece investigar'
  if (v === 'grey_zone')   return 'Zona cinzenta'
  return 'Mau negócio'
}
function verdictBg(v: string): RGB {
  if (v === 'excellent')   return [240, 253, 244]
  if (v === 'investigate') return [247, 254, 231]
  if (v === 'grey_zone')   return [255, 251, 235]
  return [254, 242, 242]
}

// ── AI text extraction ───────────────────────────────────────────────────────
function extractAiText(raw: string): string {
  try {
    const p = JSON.parse(raw)
    if (p?.resumo) {
      const parts: string[] = [p.resumo]
      if (p.contextoPricing) parts.push(p.contextoPricing)
      if (Array.isArray(p.riscos) && p.riscos.length) {
        parts.push('Riscos principais:')
        p.riscos.forEach((r: string) => parts.push(`  • ${r}`))
      }
      if (Array.isArray(p.proximosPassos) && p.proximosPassos.length) {
        parts.push('Próximos passos:')
        p.proximosPassos.forEach((s: string) => parts.push(`  → ${s}`))
      }
      return parts.join('\n')
    }
  } catch { /* plain text */ }
  return raw
    .replace(/#{1,3} /gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim()
}

// ── Main export function ─────────────────────────────────────────────────────
export async function exportAnalysisPdf(result: AnalysisResult): Promise<void> {
  const { property, comparables, marketStats, ineData, financial, verdict, aiAnalysis } = result

  const valuation = result.valuation ?? {
    fairPricePerSqm:  Math.round(marketStats.medianPricePerSqm * 0.88),
    minPricePerSqm:   Math.round(marketStats.min * 0.92),
    maxPricePerSqm:   Math.round(marketStats.max * 0.92),
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let y = 0
  let pageN = 1

  // ── Colour helpers ─────────────────────────────────────────────────────────
  const fc = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
  const dc = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
  const tc = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])
  const lw = (w: number) => doc.setLineWidth(w)
  const hline = (color: RGB = C.line, weight = 0.2) => {
    dc(color); lw(weight); doc.line(ML, y, PW - MR, y)
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  function drawFooter() {
    dc(C.line); lw(0.2)
    doc.line(ML, PH - 13, PW - MR, PH - 13)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); tc(C.muted)
    doc.text(
      'Esta análise é uma estimativa para uso interno. Não constitui aconselhamento financeiro ou legal.',
      PW / 2, PH - 9, { align: 'center' }
    )
    doc.text(String(pageN), PW - MR, PH - 9, { align: 'right' })
  }

  // ── Page break ─────────────────────────────────────────────────────────────
  function addPage() {
    drawFooter()
    doc.addPage()
    pageN++
    y = 20
    dc(C.line); lw(0.2); doc.line(ML, 12, PW - MR, 12)
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); tc(C.muted)
    doc.text(`GoldSearch · ${property.address}`, ML, 10)
    doc.text(String(pageN), PW - MR, 10, { align: 'right' })
  }

  function need(h: number) {
    if (y + h > PH - 18) addPage()
  }

  // ── Section header ─────────────────────────────────────────────────────────
  function sectionHead(label: string) {
    need(14)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(C.muted)
    doc.text(label, ML, y); y += 2
    hline(C.purple, 0.5); y += 7
  }

  // ── Financial table row ────────────────────────────────────────────────────
  function finRow(label: string, value: string, opts: {
    neg?: boolean; bold?: boolean; highlight?: boolean
    positive?: boolean; subheader?: boolean
  } = {}) {
    need(7)
    if (opts.subheader) {
      fc(C.sand); doc.rect(ML, y - 1, CW, 6, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(C.purple)
      doc.text(label, ML + 3, y + 3); y += 7; return
    }
    dc(C.line); lw(0.15); doc.line(ML, y + 4.5, PW - MR, y + 4.5)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(8); tc(opts.bold ? C.ink : C.muted)
    doc.text(label, ML + 3, y + 3)
    tc(
      opts.highlight         ? C.gold    :
      opts.positive === true  ? C.emerald :
      opts.positive === false ? C.red     :
      opts.neg               ? C.muted   : C.ink
    )
    doc.text(value, PW - MR - 3, y + 3, { align: 'right' })
    y += 6
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════════
  fc(C.purple); doc.rect(0, 0, PW, 32, 'F')
  fc(C.gold);   doc.rect(0, 32, PW, 1.5, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(21); tc(C.gold)
  doc.text('GoldSearch', ML, 15)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); tc(C.white)
  doc.text('Polar Investimentos', ML, 22)

  const dateStr = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
  tc([200, 200, 200] as RGB); doc.setFontSize(7.5)
  doc.text(dateStr, PW - MR, 15, { align: 'right' })
  tc(C.gold); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
  doc.text('ANÁLISE DE INVESTIMENTO IMOBILIÁRIO', PW - MR, 22, { align: 'right' })

  y = 42

  // ══════════════════════════════════════════════════════════════════════════
  // PROPERTY CARD
  // ══════════════════════════════════════════════════════════════════════════
  const askPerM2 = Math.round(property.askingPrice / property.area)
  const condMap: Record<string, string> = {
    bad: 'Mau estado', renovation: 'Para renovação',
    good: 'Bom estado', renovated: 'Remodelado',
  }

  fc(C.sand); dc(C.line); lw(0.2)
  doc.rect(ML, y, CW, 26, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(C.ink)
  doc.text(property.address, ML + 5, y + 8)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(C.muted)
  doc.text(
    `${property.typology}  ·  ${property.area} m²  ·  ${formatCurrency(property.askingPrice)} pedido  ·  ${condMap[property.condition] ?? property.condition}`,
    ML + 5, y + 15
  )
  doc.setFontSize(8)
  doc.text(`${formatCurrency(askPerM2)}/m² pedido`, ML + 5, y + 21)
  y += 32

  // ══════════════════════════════════════════════════════════════════════════
  // PRICE POSITIONING
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('POSICIONAMENTO DE PREÇO')

  const priceDiff = valuation.fairPricePerSqm > 0
    ? ((askPerM2 - valuation.fairPricePerSqm) / valuation.fairPricePerSqm) * 100
    : 0
  const propColor: RGB = priceDiff < -5 ? C.emerald : priceDiff > 5 ? C.red : C.amber

  // Three price columns
  const third = CW / 3
  const priceCols = [
    { label: 'ESTE IMÓVEL',  total: property.askingPrice,                                pm2: askPerM2,                    color: propColor },
    { label: 'PREÇO MÉDIO',  total: Math.round(valuation.fairPricePerSqm * property.area), pm2: valuation.fairPricePerSqm, color: C.amber   },
    { label: 'PREÇO MÁXIMO', total: Math.round(valuation.maxPricePerSqm * property.area),  pm2: valuation.maxPricePerSqm,  color: C.red     },
  ]
  for (let i = 0; i < 3; i++) {
    const col = priceCols[i]
    const align = (['left', 'center', 'right'] as const)[i]
    const tx = i === 0 ? ML + 2 : i === 1 ? ML + third + third / 2 : PW - MR - 2

    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); tc(C.muted)
    doc.text(col.label, tx, y, { align })
    doc.setFontSize(12); tc(col.color)
    doc.text(formatCurrency(col.total), tx, y + 7, { align })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); tc(C.muted)
    doc.text(`${formatCurrency(col.pm2)}/m²`, tx, y + 12, { align })
  }
  y += 18

  // Gradient bar (three solid blocks)
  const bx = ML, bw = CW, bh = 5, bt3 = bw / 3
  fc(C.emerald); doc.rect(bx,          y, bt3, bh, 'F')
  fc(C.amber);   doc.rect(bx + bt3,    y, bt3, bh, 'F')
  fc(C.red);     doc.rect(bx + bt3 * 2, y, bt3, bh, 'F')

  // Bar marker positions
  const bRange = (valuation.maxPricePerSqm - valuation.minPricePerSqm) * 1.25 || bw
  const toBarX = (pm2: number) =>
    bx + (Math.min(93, Math.max(5, ((pm2 - valuation.minPricePerSqm) / bRange) * 100)) / 100) * bw
  const barCY = y + bh / 2

  // Median dot
  fc(C.white); dc(C.amber); lw(0.5); doc.circle(toBarX(valuation.fairPricePerSqm), barCY, 1.8, 'FD')
  // Max dot
  dc(C.red);   doc.circle(toBarX(valuation.maxPricePerSqm), barCY, 1.8, 'FD')
  // Property marker
  fc(C.white); dc(propColor); lw(0.8); doc.circle(toBarX(askPerM2), barCY, 2.8, 'FD')

  y += bh + 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); tc(propColor)
  doc.text(
    `Este imóvel está ${Math.abs(priceDiff).toFixed(0)}% ${priceDiff < -5 ? 'abaixo' : priceDiff > 5 ? 'acima' : 'na'} da mediana · ${comparables.length} comparáveis activos na zona`,
    PW / 2, y, { align: 'center' }
  )
  y += 10

  // ══════════════════════════════════════════════════════════════════════════
  // MARKET SIGNALS
  // ══════════════════════════════════════════════════════════════════════════
  if (comparables.length > 0 || ineData) {
    sectionHead('SINAIS DE MERCADO')

    // Card helper
    function signalCard(label: string, value: string, valueColor: RGB, desc: string, footnote?: string) {
      need(20)
      fc(C.sand); dc(C.line); lw(0.2)
      doc.rect(ML, y, CW, 18, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); tc(C.muted)
      doc.text(label, ML + 4, y + 5)
      doc.setFontSize(13); tc(valueColor)
      doc.text(value, ML + 4, y + 13)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); tc(C.ink)
      const lines = doc.splitTextToSize(desc, CW - 55)
      doc.text(lines, ML + 54, y + 7)
      if (footnote) {
        doc.setFontSize(6); tc(C.muted)
        doc.text(footnote, ML + 54, y + 7 + lines.length * 3.8 + 1)
      }
      y += 22
    }

    if (ineData && ineData.medianPricePerSqm > 0 && marketStats.medianPricePerSqm > 0) {
      const negPct = ((ineData.medianPricePerSqm - marketStats.medianPricePerSqm) / marketStats.medianPricePerSqm) * 100
      signalCard(
        'NEGOCIAÇÃO', `${negPct.toFixed(0)}%`, C.amber,
        'Diferença típica entre preço pedido e transacção real neste município. Indica espaço para negociar abaixo do valor pedido.',
        `Fonte: INE Portugal · ${ineData.region} · ${ineData.period}`
      )
    }

    if (ineData?.priceChangePct != null) {
      const pct = ineData.priceChangePct!
      signalCard(
        'VALORIZAÇÃO A.A.',
        `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`,
        pct >= 0 ? C.emerald : C.red,
        pct >= 5  ? 'Valorização moderada a elevada. Boa tendência para revenda no médio prazo.'
        : pct >= 0 ? 'Valorização lenta. O timing de saída será importante para garantir margem.'
                  : 'Mercado em desvalorização. Reavalie o horizonte de saída e preço de compra.',
        `Fonte: INE Portugal · ${ineData.region} · ${ineData.period}`
      )
    }

    if (comparables.length > 0) {
      signalCard(
        'OFERTA ACTIVA', String(comparables.length),
        comparables.length < 10 ? C.blue : comparables.length <= 20 ? C.amber : C.red,
        comparables.length < 10 ? 'Oferta limitada — menos concorrência no momento de revenda após remodelação.'
        : comparables.length <= 20 ? 'Oferta moderada. Concorrência razoável na revenda — preço e acabamentos farão a diferença.'
        : 'Alta oferta na zona. Mais concorrência na revenda — o imóvel precisa destacar-se.',
        `Fonte: Imovirtual · ${property.typology} · raio 5km`
      )
    }
    y += 2
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCIAL BREAKDOWN
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('ANÁLISE FINANCEIRA')

  need(8)
  fc(C.purple); doc.rect(ML, y, CW, 6, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(C.white)
  doc.text('Item', ML + 3, y + 4)
  doc.text('Valor', PW - MR - 3, y + 4, { align: 'right' })
  y += 8

  finRow('CUSTOS DE COMPRA', '', { subheader: true })
  finRow('Preço de compra', formatCurrency(financial.purchasePrice))
  finRow(`IMT (${((financial.imt / (financial.purchasePrice || 1)) * 100).toFixed(1)}%)`, `− ${formatCurrency(financial.imt)}`, { neg: true })
  finRow('Imposto de Selo (0.8%)', `− ${formatCurrency(financial.stampDuty)}`, { neg: true })
  finRow('Escritura e registos', `− ${formatCurrency(financial.notaryFees)}`, { neg: true })
  if (financial.renovationCost > 0)
    finRow('Obras', `− ${formatCurrency(financial.renovationCost)}`, { neg: true })
  finRow('Total investido', formatCurrency(financial.totalAcquisitionCost), { bold: true })

  finRow('PROJEÇÃO DE VENDA', '', { subheader: true })
  finRow('Venda estimada', formatCurrency(financial.estimatedSalePrice), { highlight: true })
  finRow('Comissão agência (5%)', `− ${formatCurrency(financial.agencyCommission)}`, { neg: true })
  finRow('IVA comissão (23%)', `− ${formatCurrency(financial.agencyVAT)}`, { neg: true })
  finRow('IRS mais-valias', `− ${formatCurrency(financial.capitalGainsTax)}`, { neg: true })
  finRow('Certificado energético', `− ${formatCurrency(financial.energyCertificate)}`, { neg: true })
  finRow('Lucro líquido', formatCurrency(financial.netProfit), {
    bold: true, positive: financial.netProfit >= 0,
  })
  y += 4

  // Margin summary box
  need(18)
  const mc: RGB = financial.netMargin >= 25 ? C.emerald : financial.netMargin >= 10 ? C.amber : C.red
  const mb: RGB = financial.netMargin >= 25 ? [240, 253, 244] : financial.netMargin >= 10 ? [255, 251, 235] : [254, 242, 242]
  fc(mb); dc(mc); lw(0.5); doc.rect(ML, y, CW, 16, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); tc(C.ink)
  doc.text('Margem líquida sobre investimento', ML + 5, y + 6)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tc(C.muted)
  doc.text(
    `Lucro ${formatCurrency(financial.netProfit)}  ·  Investimento total ${formatCurrency(financial.totalAcquisitionCost)}`,
    ML + 5, y + 12
  )
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); tc(mc)
  doc.text(
    `${financial.netMargin >= 0 ? '+' : ''}${financial.netMargin.toFixed(1)}%`,
    PW - MR - 5, y + 12, { align: 'right' }
  )
  y += 22

  // ══════════════════════════════════════════════════════════════════════════
  // VERDICT
  // ══════════════════════════════════════════════════════════════════════════
  sectionHead('VEREDICTO')

  const vc = verdictColor(verdict)
  const vl = verdictLabel(verdict)
  const vb = verdictBg(verdict)

  need(20)
  fc(vb); dc(vc); lw(0.5); doc.rect(ML, y, CW, 18, 'FD')
  fc(vc); doc.rect(ML, y, 3, 18, 'F')  // left stripe
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(vc)
  doc.text(vl, ML + 8, y + 8)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(C.muted)
  doc.text(
    `Margem líquida: ${financial.netMargin >= 0 ? '+' : ''}${financial.netMargin.toFixed(1)}%`,
    ML + 8, y + 14
  )
  y += 24

  // AI analysis text
  const aiText = extractAiText(aiAnalysis)
  const aiLines = doc.splitTextToSize(aiText, CW - 6)
  doc.setFontSize(8.5)

  for (const line of aiLines) {
    need(5)
    const isBold = line.trim().startsWith('Riscos') || line.trim().startsWith('Próximos')
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    tc(isBold ? C.purple : C.ink)
    doc.text(line, ML + 3, y)
    y += 4.5
  }
  y += 8

  // ══════════════════════════════════════════════════════════════════════════
  // COMPARABLES
  // ══════════════════════════════════════════════════════════════════════════
  if (comparables.length > 0) {
    sectionHead('IMÓVEIS COMPARÁVEIS · IMOVIRTUAL')

    need(10)
    fc(C.purple); doc.rect(ML, y, CW, 6, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); tc(C.white)
    const colX = { loc: ML + 3, price: ML + 78, m2: ML + 109, ppm2: ML + 130, dom: ML + 155 }
    doc.text('Localização', colX.loc, y + 4)
    doc.text('Preço', colX.price, y + 4)
    doc.text('m²', colX.m2, y + 4)
    doc.text('€/m²', colX.ppm2, y + 4)
    doc.text('Dias', colX.dom, y + 4)
    y += 7

    for (let i = 0; i < comparables.length; i++) {
      const comp = comparables[i]
      need(7)
      if (i % 2 === 0) { fc(C.sand); doc.rect(ML, y - 1, CW, 6, 'F') }
      dc(C.line); lw(0.15); doc.line(ML, y + 4.5, PW - MR, y + 4.5)

      const loc = comp.location.length > 40 ? comp.location.slice(0, 39) + '…' : comp.location
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
      tc(C.muted); doc.text(loc, colX.loc, y + 3)
      tc(C.ink); doc.text(formatCurrency(comp.price), colX.price, y + 3)
      doc.text(String(comp.area), colX.m2, y + 3)

      const diff = marketStats.medianPricePerSqm > 0
        ? ((comp.pricePerSqm - marketStats.medianPricePerSqm) / marketStats.medianPricePerSqm) * 100
        : 0
      tc(diff < -5 ? C.emerald : diff > 5 ? C.red : C.amber)
      doc.text(formatCurrency(comp.pricePerSqm), colX.ppm2, y + 3)

      tc(comp.daysOnMarket < 90 ? C.emerald : comp.daysOnMarket < 180 ? C.amber : C.red)
      doc.text(comp.daysOnMarket > 0 ? String(comp.daysOnMarket) : '—', colX.dom, y + 3)
      y += 6
    }
    y += 4
  }

  // ── Final footer + download ───────────────────────────────────────────────
  drawFooter()

  const slug = property.address
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 45)
  const dateSlug = new Date().toISOString().slice(0, 10)
  const filename = `GoldSearch_${slug}_${dateSlug}.pdf`

  // Use blob + <a download> instead of doc.save() to avoid any browser navigation side-effects
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
