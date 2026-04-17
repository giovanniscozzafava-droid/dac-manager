import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { Operatore } from '../hooks/useAuth';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  operatore: Operatore;
  isAdmin: boolean;
  onCambiaOperatore: () => void;
  onLogout: () => void;
  onLogoutFull: () => Promise<void>;
}

const NAV_ITEMS: any[] = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/agenda', icon: '📅', label: 'Agenda' },
  { path: '/pazienti', icon: '👥', label: 'Pazienti' },
  { path: '/task', icon: '📋', label: 'Task' },
  { path: '/anamnesi', icon: '🩺', label: 'Anamnesi' },
  { path: '/pacchetti', icon: '📦', label: 'Pacchetti' },
  { path: '/bug-reports', icon: '🐛', label: 'Segnala Bug' },
  { path: '/specialisti', icon: '👨\u200d⚕️', label: 'Specialisti', adminOnly: true },
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
  onLogoutFull,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Chiudi drawer mobile al cambio pagina
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Blocca scroll body quando drawer aperto su mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-800">
        <span className="text-xl flex-shrink-0">🏥</span>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">
              Palazzo della Salute
            </div>
            <div className="text-[10px] text-slate-500">DAC Manager v1.3</div>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map((item: any, i: number) => {
          if (item.adminOnly && !isAdmin) return null;

          if (item.divider) {
            if (collapsed && !isMobile) return <div key={i} className="my-2 border-t border-slate-800" />;
            return (
              <div key={i} className="px-2 pt-4 pb-1 text-[9px] uppercase tracking-wider text-slate-600 font-semibold">
                {item.label}
              </div>
            );
          }

          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path!}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-all duration-150 min-h-[44px] ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="text-base flex-shrink-0 w-6 text-center">{item.icon}</span>
              {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
              {isActive && (!collapsed || isMobile) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-2">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/60 transition-colors min-h-[44px]"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {operatore.nome.charAt(0)}
            </div>
            {(!collapsed || isMobile) && (
              <div className="min-w-0 text-left">
                <div className="text-xs font-medium text-white truncate">{operatore.nome}</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {operatore.settore || operatore.ruolo}
                </div>
              </div>
            )}
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                <div className="px-3 py-2 border-b border-slate-700">
                  <div className="text-xs font-medium text-white">{operatore.nome}</div>
                  <div className="text-[10px] text-slate-400">
                    {operatore.ruolo}{operatore.settore ? ` — ${operatore.settore}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); onCambiaOperatore(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                >
                  <span>👤</span><span>Cambia operatore</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onLogoutFull(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-slate-700"
                >
                  <span>🚪</span><span>Esci</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Collapse toggle solo su desktop */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block w-full mt-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-400 text-xs text-center"
          >
            {collapsed ? '→' : '← Comprimi'}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* ─── SIDEBAR DESKTOP/TABLET (>= lg = 1024px) ─── */}
      <aside
        className={`hidden lg:flex ${
          collapsed ? 'w-16' : 'w-56'
        } flex-col bg-slate-950 border-r border-slate-800 transition-all duration-200 flex-shrink-0`}
      >
        {sidebarContent(false)}
      </aside>

      {/* ─── SIDEBAR MOBILE (DRAWER) ─── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[85vw] flex flex-col bg-slate-950 border-r border-slate-800 animate-slide-in-left">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR MOBILE */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-800 text-white"
            aria-label="Apri menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span>🏥</span>
            <span className="text-sm font-bold">Palazzo della Salute</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
            {operatore.nome.charAt(0)}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-900">{children}</main>
      </div>
    </div>
  );
}
