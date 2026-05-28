export default function LoadingView() {
  const steps = [
    { label: 'A pesquisar comparáveis no Idealista.pt', delay: 0 },
    { label: 'A calcular análise financeira', delay: 2 },
    { label: 'A gerar veredicto com IA', delay: 4 },
  ]

  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="relative inline-block mb-8">
        <div className="w-16 h-16 rounded-full border-2 border-polar-gold/30 border-t-polar-gold animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-polar-gold text-lg font-display">G</span>
        </div>
      </div>

      <h2 className="font-display text-2xl text-polar-cream mb-2">
        A analisar o imóvel
      </h2>
      <p className="text-polar-cream/50 text-sm mb-10">
        Isto pode demorar 15–30 segundos
      </p>

      <div className="space-y-4 text-left">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 text-sm"
            style={{ animationDelay: `${step.delay}s` }}
          >
            <div
              className="w-2 h-2 rounded-full bg-polar-gold animate-pulse"
              style={{ animationDelay: `${step.delay * 0.5}s` }}
            />
            <span className="text-polar-cream/60">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
