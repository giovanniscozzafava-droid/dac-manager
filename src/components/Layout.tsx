import { useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Operatore } from '@/hooks/useAuth'
import {
  LayoutDashboard, Calendar, Users, CheckSquare, Package,
  DollarSign, TrendingDown, FlaskConical, Stethoscope,
  Store, ClipboardList, Settings, ChevronLeft, ChevronRight,
  LogOut, RefreshCw, Menu, X
} from 'lucide-react'

interface Props {
  operatore: Operatore
  onLogout: () => void
  onLogoutFull: () => void
  children: ReactNode
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, emoji: '📊' },
  { path: '/agenda', label: 'Agenda', icon: Calendar, emoji: '📅' },
  { path: '/pazienti', label: 'Pazienti', icon: Users, emoji: '👥' },
  { path: '/task', label: 'Task', icon: CheckSquare, emoji: '✅' },
  { divider: true, label: 'Contabilità' },
  { path: '/pacchetti', label: 'Pacchetti', icon: Package, emoji: '📦' },
  { path: '/ricavi', label: 'Ricavi', icon: DollarSign, emoji: '💰' },
  { path: '/costi', label: 'Costi', icon: TrendingDown, emoji: '📉' },
  { divider: true, label: 'Struttura' },
  { path: '/inventario', label: 'Inventario', icon: FlaskConical, emoji: '🧪' },
  { path: '/specialisti', label: 'Specialisti', icon: Stethoscope, emoji: '🩺' },
  { path: '/parafarmacia', label: 'Parafarmacia', icon: Store, emoji: '🏪' },
  { path: '/anamnesi', label: 'Anamnesi', icon: ClipboardList, emoji: '📋' },
  { divider: true, label: 'Sistema' },
  { path: '/config', label: 'Config', icon: Settings, emoji: '⚙️' },
]

export function Layout({ operatore, onLogout, onLogoutFull, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="h-screen flex overflow-hidden noise-bg">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col
          bg-dac-deep border-r border-white/5
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-56'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center gap-2.5 p-3 border-b border-white/5 flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a5276, #2e86c1)' }}>
            🏥
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-white truncate">DAC Manager</div>
              <div className="text-[10px] text-dac-gray-400 truncate">Palazzo della Salute</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_ITEMS.map((item, i) => {
            if ('divider' in item && item.divider) {
              if (collapsed) return <div key={i} className="my-2 border-t border-white/5" />
              return (
                <div key={i} className="mt-4 mb-1 px-2">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-dac-gray-500">
                    {item.label}
                  </span>
                </div>
              )
            }

            const isActive = location.pathname === item.path
            const Icon = item.icon!

            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path!); setMobileOpen(false) }}
                className={`
                  w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5
                  text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-dac-accent/15 text-dac-accent'
                    : 'text-dac-gray-400 hover:text-white hover:bg-white/5'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Operatore + collapse */}
        <div className="border-t border-white/5 p-2 flex-shrink-0">
          {/* Operatore info */}
          <div className={`flex items-center gap-2 px-2 py-2 rounded-lg bg-white/3 mb-2 ${collapsed ? 'justify-center' : ''}`}>
            <span className="text-lg flex-shrink-0">{operatore.emoji}</span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{operatore.nome}</div>
                <div className="text-[10px] text-dac-gray-500 truncate">{operatore.ruolo}</div>
              </div>
            )}
          </div>

          <div className={`flex ${collapsed ? 'flex-col items-center gap-1' : 'items-center justify-between'}`}>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-dac-gray-500 hover:text-dac-orange hover:bg-dac-orange/10 transition-colors"
              title="Cambia operatore"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onLogoutFull}
              className="p-1.5 rounded-md text-dac-gray-500 hover:text-dac-red hover:bg-dac-red/10 transition-colors"
              title="Esci"
            >
              <LogOut size={14} />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-dac-gray-500 hover:text-white hover:bg-white/5 transition-colors hidden lg:block"
              title={collapsed ? 'Espandi' : 'Comprimi'}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-dac-deep/50 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1 rounded-md text-dac-gray-400 hover:text-white"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-lg">🏥</span>
          <span className="font-display font-bold text-sm text-white">DAC Manager</span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
