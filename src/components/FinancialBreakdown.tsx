import type { FinancialBreakdown as FinancialBreakdownType } from '../lib/types'
import { formatCurrency, formatPercent } from '../lib/financial'

interface Props {
  financial: FinancialBreakdownType
}

export default function FinancialBreakdown({ financial: f }: Props) {
  return (
    <div className="card">
      <h3 className="font-display text-xl text-polar-cream mb-6">
        Análise financeira
      </h3>

      <div className="space-y-6">
        {/* Acquisition */}
        <Section title="Custos de aquisição">
          <Row label="Preço de compra" value={formatCurrency(f.purchasePrice)} />
          <Row
            label="IMT (investimento)"
            value={formatCurrency(f.imt)}
            sub={`${formatPercent((f.imt / f.purchasePrice) * 100)} do preço`}
          />
          <Row
            label="Imposto de Selo"
            value={formatCurrency(f.stampDuty)}
            sub="0.8% do preço"
          />
          <Row label="Escritura e registos" value={formatCurrency(f.notaryFees)} sub="Casa Pronta" />
          {f.renovationCost > 0 && (
            <Row label="Obras" value={formatCurrency(f.renovationCost)} />
          )}
          <Row
            label="Total investido"
            value={formatCurrency(f.totalAcquisitionCost)}
            bold
          />
        </Section>

        {/* Sale */}
        <Section title="Custos de venda">
          <Row
            label="Preço estimado de venda"
            value={formatCurrency(f.estimatedSalePrice)}
            highlight
          />
          <Row
            label="Comissão agência (5%)"
            value={`− ${formatCurrency(f.agencyCommission)}`}
            negative
          />
          <Row
            label="IVA sobre comissão (23%)"
            value={`− ${formatCurrency(f.agencyVAT)}`}
            negative
          />
          <Row
            label="IRS sobre mais-valias"
            value={`− ${formatCurrency(f.capitalGainsTax)}`}
            negative
            sub="50% da mais-valia × 28%"
          />
          <Row
            label="Certificado energético"
            value={`− ${formatCurrency(f.energyCertificate)}`}
            negative
          />
        </Section>

        {/* Result */}
        <div className="border-t border-white/10 pt-5 space-y-3">
          <Row
            label="Lucro bruto"
            value={formatCurrency(f.grossProfit)}
            sub="Antes de impostos e comissões"
          />
          <div className="flex items-center justify-between py-3 px-4 bg-polar-purple-dark rounded-xl">
            <div>
              <div className="font-semibold text-polar-cream">Lucro líquido</div>
              <div className="text-xs text-polar-cream/50">
                Margem: {formatPercent(f.netMargin)} · ROI: {formatPercent(f.roi)}
              </div>
            </div>
            <div
              className={`text-xl font-bold ${f.netProfit >= 0 ? 'text-verdict-investigate' : 'text-verdict-pass'}`}
            >
              {formatCurrency(f.netProfit)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-medium text-polar-gold/70 uppercase tracking-wider mb-3">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  sub,
  bold,
  negative,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  bold?: boolean
  negative?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <div>
        <div
          className={`text-sm ${bold ? 'font-semibold text-polar-cream' : 'text-polar-cream/70'}`}
        >
          {label}
        </div>
        {sub && <div className="text-xs text-polar-cream/40">{sub}</div>}
      </div>
      <div
        className={`text-sm font-medium ${
          highlight
            ? 'text-polar-gold'
            : negative
            ? 'text-verdict-pass'
            : bold
            ? 'text-polar-cream'
            : 'text-polar-cream/80'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
