import { useEffect, useState } from 'react'

const steps = [
  'A pesquisar comparáveis no Imovirtual + INE',
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
      <div className="relative mt-10">

        <div className="card pt-14 pb-8 px-8 flex flex-col items-center text-center">

        <h2 className="text-xl font-semibold text-polar-ink mb-1.5">
          A analisar o imóvel
        </h2>
        <p className="text-polar-ink-muted text-sm mb-8">
          Isto pode demorar 15–30 segundos
        </p>

        {/* Steps — dot + line live in the same column so the line always connects exactly */}
        <div className="w-full text-left">
          {steps.map((label, i) => {
            const isCurrent = i === activeStep
            const isCompleted = i < activeStep
            const isLast = i === steps.length - 1

            return (
              <div key={i} className="flex gap-3">
                {/* Left column: dot then connector to next dot */}
                <div className="flex flex-col items-center">
                  <div className={`
                    w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all duration-500 flex items-center justify-center mt-0.5
                    ${isCurrent ? 'bg-polar-purple scale-110 shadow-sm' : ''}
                    ${isCompleted ? 'bg-polar-purple-light' : ''}
                    ${!isCurrent && !isCompleted ? 'border border-polar-line bg-white' : ''}
                  `}>
                    {isCompleted && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                        <path d="M1.5 4l1.8 1.8L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-polar-line my-1" />}
                </div>

                {/* Label */}
                <span className={`text-sm transition-colors duration-500 ${isLast ? 'pt-0.5' : 'pb-5'} ${
                  isCurrent ? 'text-polar-ink font-medium' :
                  isCompleted ? 'text-polar-ink-muted' :
                  'text-polar-ink-muted/40'
                }`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        </div>{/* end .card */}

        {/* Spinner — declared after card so it renders on top */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-10">
          <div className="w-20 h-20 rounded-full border-2 border-polar-line border-t-polar-purple animate-spin" />
          <div
            className="absolute rounded-full bg-polar-purple flex items-center justify-center"
            style={{ inset: '5px' }}
          >
            <img src="/polar-logo-house-gold.svg" alt="" className="h-7 w-auto" />
          </div>
        </div>

      </div>{/* end relative wrapper */}
    </div>
  )
}
