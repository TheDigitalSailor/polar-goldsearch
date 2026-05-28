import { useEffect, useState } from 'react'

const steps = [
  'A pesquisar comparáveis no Idealista.pt',
  'A calcular análise financeira',
  'A gerar veredicto com IA',
]

export default function LoadingView() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setActiveStep(1), 2000)
    const t2 = setTimeout(() => setActiveStep(2), 4500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <div className="card p-8 flex flex-col items-center text-center">

        {/* Spinner with branding */}
        <div className="relative inline-block mb-7">
          <div className="w-16 h-16 rounded-full border-2 border-polar-line border-t-polar-purple animate-spin" />
          <div className="absolute inset-[5px] rounded-full bg-polar-purple flex items-center justify-center">
            <img src="/polar-logo-house-gold.svg" alt="" className="h-6 w-auto" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-polar-ink mb-1.5">
          A analisar o imóvel
        </h2>
        <p className="text-polar-ink-muted text-sm mb-8">
          Isto pode demorar 15–30 segundos
        </p>

        {/* Steps with vertical connecting line */}
        <div className="w-full text-left relative">
          {/* Connecting line */}
          <div className="absolute left-[6px] top-[7px] bottom-[7px] w-px bg-polar-line" />

          <div className="space-y-5">
            {steps.map((label, i) => {
              const isActive = i <= activeStep
              return (
                <div key={i} className="relative flex items-center gap-3">
                  <div className={`
                    relative z-10 w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all duration-500
                    ${isActive
                      ? 'bg-polar-purple scale-110 shadow-sm'
                      : 'bg-stone-200'}
                  `} />
                  <span className={`text-sm transition-colors duration-500 ${
                    isActive ? 'text-polar-ink font-medium' : 'text-polar-ink-muted/50'
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
