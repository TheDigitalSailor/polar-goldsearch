import { Search, History, FlaskConical, Trophy, BarChart2, Calculator, Building2 } from 'lucide-react'

type Screen = 'form' | 'loading' | 'results' | 'history'

interface Props {
  screen: Screen
  mockMode: boolean
  onNavigate: (screen: Screen) => void
  onToggleMock: () => void
}

const sections = [
  { id: 'verdict',     icon: <Trophy size={15}/>,     label: 'Veredicto'      },
  { id: 'price',       icon: <BarChart2 size={15}/>,  label: 'Posicionamento' },
  { id: 'financial',   icon: <Calculator size={15}/>, label: 'Financeiro'     },
  { id: 'comparables', icon: <Building2 size={15}/>,  label: 'Comparáveis'    },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Sidebar({ screen, mockMode, onNavigate, onToggleMock }: Props) {
  const isResults = screen === 'results'

  return (
    <aside className="w-56 flex flex-col py-5 border-r border-polar-line flex-shrink-0 bg-white">

      {/* Brand */}
      <div className="px-4 mb-7">
        <button
          onClick={() => onNavigate('form')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-polar-purple flex items-center justify-center flex-shrink-0 group-hover:bg-polar-purple-light transition-colors">
            <span className="font-display text-polar-cream text-xs font-bold tracking-wider">GS</span>
          </div>
          <div>
            <div className="text-sm font-bold text-polar-ink leading-none">GoldSearch</div>
            <div className="text-[10px] text-polar-ink-muted leading-none mt-0.5">Polar Investimentos</div>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1 px-2">
        {!isResults ? (
          <>
            <NavItem
              icon={<Search size={15}/>}
              label="Nova análise"
              active={screen === 'form' || screen === 'loading'}
              onClick={() => onNavigate('form')}
            />
            <NavItem
              icon={<History size={15}/>}
              label="Histórico"
              active={screen === 'history'}
              onClick={() => onNavigate('history')}
            />
          </>
        ) : (
          <>
            <div className="px-2 mb-1 mt-1">
              <span className="text-[10px] font-semibold text-polar-ink-muted uppercase tracking-widest">
                Análise actual
              </span>
            </div>
            {sections.map(s => (
              <NavItem
                key={s.id}
                icon={s.icon}
                label={s.label}
                active={false}
                onClick={() => scrollTo(s.id)}
              />
            ))}
            <div className="mx-2 my-2 border-t border-polar-line" />
            <NavItem
              icon={<History size={15}/>}
              label="Histórico"
              active={false}
              onClick={() => onNavigate('history')}
            />
          </>
        )}
      </nav>

      {/* Mock mode toggle */}
      <div className="px-2 pt-3 border-t border-polar-line mt-2">
        <button
          onClick={onToggleMock}
          title={mockMode ? 'Mock ON — clica para desligar' : 'Ligar mock mode'}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mockMode
              ? 'bg-amber-100 text-amber-700 border border-amber-200'
              : 'text-polar-ink-muted hover:text-polar-ink hover:bg-polar-sand'
          }`}
        >
          <FlaskConical size={15} />
          <span>{mockMode ? 'Mock ON' : 'Mock mode'}</span>
          {mockMode && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
        active
          ? 'bg-polar-purple text-white'
          : 'text-polar-ink-muted hover:text-polar-ink hover:bg-polar-sand'
      }`}
    >
      <span className={active ? 'text-white/80' : 'text-polar-ink-muted'}>{icon}</span>
      {label}
    </button>
  )
}
