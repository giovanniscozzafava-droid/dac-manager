import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { Operatore } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
  operatore: Operatore;
  isAdmin: boolean;
  onCambiaOperatore: () => void;
  onLogout: () => void;
  onLogoutFull: () => Promise<void>;
}

const NAV_ITEMS = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/agenda', icon: '📅', label: 'Agenda' },
  { path: '/pazienti', icon: '👥', label: 'Pazienti' },
  { path: '/task', icon: '📋', label: 'Task' },
  { path: '/anamnesi', icon: '🩺', label: 'Anamnesi' },
  { path: '/pacchetti', icon: '📦', label: 'Pacchetti' },
  { path: '/bug-reports', icon: '🐛', label: 'Segnala Bug' },
  { path: '/specialisti', icon: '👨‍⚕️', label: 'Specialisti', adminOnly: true },
  { divider: true, label: 'Inventario' },
  { path: '/inventario', icon: '🧪', label: 'Laboratorio', adminOnly: true },
  { path: '/presidio', icon: '❤️', label: 'Presidio Infermeria' },
  { path: '/parafarmacia', icon: '🏪', label: 'Parafarmacia', adminOnly: true },
  { divider: true, label: 'Contabilità', adminOnly: true },
  { path: '/ricavi', icon: '💰', label: 'Ricavi', adminOnly: true },
  { path: '/costi', icon: '📉', label: 'Costi', adminOnly: true },
  { path: '/contabilita', icon: '📊', label: 'Report', adminOnly: true },
  { divider: true, label: 'Sistema', adminOnly: true },
  { path: '/config', icon: '⚙️', label: 'Configurazione', adminOnly: true },
];

export default function Layout({
  children,
  operatore,
  isAdmin,
  onCambiaOperatore,
  onLogout,
  onLogoutFull,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-56'
        } flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-200 flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-800">
          <span className="text-xl flex-shrink-0">🏥</span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                Palazzo della Salute
              </div>
              <div className="text-[10px] text-slate-500">DAC Manager v1.3</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV_ITEMS.map((item, i) => {
            if (item.adminOnly && !isAdmin) return null;

            if (item.divider) {
              if (collapsed) return <div key={i} className="my-2 border-t border-slate-800" />;
              return (
                <div
                  key={i}
                  className="px-2 pt-4 pb-1 text-[9px] uppercase tracking-wider text-slate-600 font-semibold"
                >
                  {item.label}
                </div>
              );
            }

            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path!}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="text-base flex-shrink-0 w-6 text-center">
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800 p-2">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {operatore.nome.charAt(0)}
              </div>
              {!collapsed && (
                <div className="min-w-0 text-left">
                  <div className="text-xs font-medium text-white truncate">
                    {operatore.nome}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {operatore.settore || operatore.ruolo}
                  </div>
                </div>
              )}
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute bottom-full left-0 mb-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-slate-700">
                    <div className="text-xs font-medium text-white">
                      {operatore.nome}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {operatore.ruolo}
                      {operatore.settore ? ` — ${operatore.settore}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onCambiaOperatore();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <span>👤</span>
                    <span>Cambia operatore</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogoutFull();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    <span>🚪</span>
                    <span>Esci da Google</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full mt-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-400 text-xs text-center transition-colors"
          >
            {collapsed ? '→' : '← Comprimi'}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 overflow-y-auto bg-slate-900">{children}</main>
    </div>
  );
}
