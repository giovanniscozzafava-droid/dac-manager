import React from 'react';
import type { Operatore } from '../hooks/useAuth';

interface SelectOperatoreProps {
  operatori: Operatore[];
  userEmail: string;
  onSelect: (operatore: Operatore) => void;
  onLogout: () => Promise<void>;
}

const EMOJI_MAP: Record<string, string> = {
  Daniela: '👩‍💼',
  Teresa: '🔬',
  'V. Liuzzo': '💅',
  'V. Crupi': '📋',
  Agnese: '💆‍♀️',
  Butera: '🏪',
  'Valentina C': '🩺',
  'Giovanni Scozzafava': '💻',
};

const COLOR_MAP: Record<string, string> = {
  Daniela: 'from-blue-600 to-blue-800',
  Teresa: 'from-emerald-600 to-emerald-800',
  'V. Liuzzo': 'from-purple-600 to-purple-800',
  'V. Crupi': 'from-amber-600 to-amber-800',
  Agnese: 'from-pink-600 to-pink-800',
  Butera: 'from-violet-600 to-violet-800',
  'Valentina C': 'from-rose-600 to-rose-800',
  'Giovanni Scozzafava': 'from-cyan-600 to-cyan-800',
};

export default function SelectOperatore({
  operatori,
  userEmail,
  onSelect,
  onLogout,
}: SelectOperatoreProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="text-center max-w-lg w-full px-4">
        {/* Header */}
        <div className="text-5xl mb-3">🏥</div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Palazzo della Salute
        </h1>
        <p className="text-blue-300/60 text-sm mb-2">DAC Manager v1.3</p>

        {/* Email utente */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-blue-200/80 text-xs mb-6">
          <span>🔑</span>
          <span>{userEmail}</span>
        </div>

        {/* Titolo selezione */}
        <p className="text-white/50 text-sm mb-4">Chi sei oggi?</p>

        {/* Griglia operatori */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {operatori.map((op) => {
            const emoji = EMOJI_MAP[op.nome] || '👤';
            const gradient = COLOR_MAP[op.nome] || 'from-gray-600 to-gray-800';

            return (
              <button
                key={op.id}
                onClick={() => onSelect(op)}
                className={`group relative p-4 bg-gradient-to-br ${gradient} rounded-xl border border-white/10 hover:border-white/30 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10`}
              >
                <div className="text-3xl mb-2">{emoji}</div>
                <div className="text-white font-semibold text-sm">
                  {op.nome}
                </div>
                <div className="text-white/40 text-[10px] mt-0.5">
                  {op.settore || op.ruolo}
                </div>
                {op.ruolo === 'admin' && (
                  <div className="absolute top-2 right-2 text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-bold">
                    ADMIN
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="text-white/30 hover:text-white/60 text-xs transition-colors"
        >
          ← Esci dall'account Google
        </button>
      </div>
    </div>
  );
}
