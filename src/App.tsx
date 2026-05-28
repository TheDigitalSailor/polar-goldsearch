import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import AnalysisForm from './components/AnalysisForm'
import ResultsView from './components/ResultsView'
import LoadingView from './components/LoadingView'
import HistoryView from './components/HistoryView'
import { analyzeProperty, getAnalysisHistory, isMockMode, toggleMockMode } from './lib/supabase'
import type { AnalysisResult, AnalysisSummary, PropertyInput } from './lib/types'

type Screen = 'form' | 'loading' | 'results' | 'history'

export default function App() {
  const [screen, setScreen] = useState<Screen>('form')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<AnalysisSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mockMode, setMockMode] = useState(isMockMode())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleToggleMock() {
    toggleMockMode()
    setMockMode(isMockMode())
  }

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

  async function handleNavigate(s: Screen) {
    if (s === 'history') {
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
    } else {
      setScreen(s)
    }
  }

  return (
    <div className="h-screen flex bg-polar-sand font-body overflow-hidden">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        screen={screen}
        mockMode={mockMode}
        onNavigate={handleNavigate}
        onToggleMock={handleToggleMock}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-polar-line">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-polar-sand transition-colors text-polar-ink-muted"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/polar-logo-house-gold.svg" alt="" className="h-5 w-auto" />
            <span className="font-display text-sm font-bold text-polar-ink">GoldSearch</span>
          </div>
        </div>
        {error && (
          <div className="m-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
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
