import type { Operatore } from '@/hooks/useAuth'
import { LogOut } from 'lucide-react'

interface Props {
  operatori: Operatore[]
  onSelect: (op: Operatore) => void
  onLogout: () => void
  userName: string
}

export function SelectOperatore({ operatori, onSelect, onLogout, userName }: Props) {
  return (
    <div className="h-screen flex flex-col items-center justify-center noise-bg"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1a2e 40%, #162038 100%)' }}>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #2e86c1 0%, transparent 70%)', filter: 'blur(80px)' }} />

      <div className="relative z-10 text-center animate-fade-in">
        <div className="text-4xl mb-3">🏥</div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">DAC Manager</h1>
        <p className="text-dac-gray-400 text-sm mb-2">Seleziona il tuo profilo</p>
        <p className="text-dac-gray-500 text-xs mb-8">
          Accesso come: {userName}
        </p>

        {/* Grid operatori */}
        <div className="flex flex-wrap gap-3 justify-center max-w-lg">
          {operatori.map((op, i) => (
            <button
              key={op.id}
              onClick={() => onSelect(op)}
              className="group flex flex-col items-center w-[100px] py-4 px-3 rounded-xl
                border-2 transition-all duration-200 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
                animationDelay: `${i * 60}ms`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.borderColor = op.colore_bordo
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">
                {op.emoji}
              </span>
              <span className="text-xs font-semibold text-white leading-tight">{op.nome}</span>
              {op.area && (
                <span className="text-[9px] text-dac-gray-400 mt-0.5 leading-tight">{op.area}</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="mt-8 inline-flex items-center gap-2 text-dac-gray-500 hover:text-dac-gray-300
            text-xs transition-colors"
        >
          <LogOut size={12} />
          Cambia account
        </button>
      </div>
    </div>
  )
}
