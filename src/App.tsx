import { useState } from 'react'
import { History } from 'lucide-react'
import AnalysisForm from './components/AnalysisForm'
import ResultsView from './components/ResultsView'
import LoadingView from './components/LoadingView'
import HistoryView from './components/HistoryView'
import { analyzeProperty, getAnalysisHistory } from './lib/supabase'
import type { AnalysisResult, AnalysisSummary, PropertyInput } from './lib/types'

type Screen = 'form' | 'loading' | 'results' | 'history'

export default function App() {
  const [screen, setScreen] = useState<Screen>('form')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<AnalysisSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze(property: PropertyInput) {
    setError(null)
    setScreen('loading')
    try {
      const data = await analyzeProperty(property)
      setResult(data)
      setScreen('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setScreen('form')
    }
  }

  async function handleOpenHistory() {
    setHistoryLoading(true)
    setScreen('history')
    try {
      const data = await getAnalysisHistory()
      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-polar-gradient font-body">
      {/* Top nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-polar-gold font-display text-xl">GS</span>
            <span className="text-polar-cream/40 text-sm">
              Polar Investimentos
            </span>
          </div>
          {screen !== 'history' && (
            <button
              onClick={handleOpenHistory}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <History size={15} />
              Histórico
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-10">
        {error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {screen === 'form' && (
          <AnalysisForm onSubmit={handleAnalyze} isLoading={false} />
        )}

        {screen === 'loading' && <LoadingView />}

        {screen === 'results' && result && (
          <ResultsView result={result} onBack={() => setScreen('form')} />
        )}

        {screen === 'history' && (
          <HistoryView
            history={history}
            isLoading={historyLoading}
            onBack={() => setScreen('form')}
          />
        )}
      </main>
    </div>
  )
}
