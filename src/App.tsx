import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginSplash from './components/LoginSplash';

import { Dashboard } from './pages/Dashboard';
import { Agenda } from './pages/Agenda';
import { Pazienti } from './pages/Pazienti';
import { TaskManager } from './pages/TaskManager';
import { Inventario } from './pages/Inventario';
import { Specialisti } from './pages/Specialisti';
import { PacchettiPage } from './pages/PacchettiPage';
import { RicaviPage } from './pages/RicaviPage';
import { CostiPage } from './pages/CostiPage';
import { ParafarmaciaPage } from './pages/ParafarmaciaPage';
import { ContabilitaPage } from './pages/ContabilitaPage';
import { ConfigPage } from './pages/ConfigPage';

import { AnamnesiPage as AnamnesiComp } from './pages/Anamnesi';

export default function App() {
  const { loading, operatore, authError, isAdmin, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-5xl mb-4">🏥</div>
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-blue-300/50 text-sm">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!operatore) {
    return <LoginSplash onLogin={login} error={authError} />;
  }

  const o = operatore;

  return (
    <BrowserRouter>
      <Layout
        operatore={o}
        isAdmin={isAdmin}
        onCambiaOperatore={logout}
        onLogout={logout}
        onLogoutFull={logout}
      >
        <Routes>
          <Route path="/" element={<Dashboard operatore={o} />} />
          <Route path="/agenda" element={<Agenda operatore={o} />} />
          <Route path="/pazienti" element={<Pazienti operatore={o} />} />
          <Route path="/task" element={<TaskManager operatore={o} />} />
          <Route path="/inventario" element={isAdmin ? <Inventario operatore={o} /> : <Navigate to="/" replace />} />
          <Route path="/specialisti" element={isAdmin ? <Specialisti operatore={o} /> : <Navigate to="/" replace />} />
          <Route path="/anamnesi" element={<AnamnesiComp operatore={o} />} />
          <Route path="/pacchetti" element={<PacchettiPage operatore={o} />} />
          <Route path="/ricavi" element={isAdmin ? <RicaviPage operatore={o} /> : <Navigate to="/" replace />} />
          <Route path="/costi" element={isAdmin ? <CostiPage operatore={o} /> : <Navigate to="/" replace />} />
          <Route path="/parafarmacia" element={isAdmin ? <ParafarmaciaPage operatore={o} /> : <Navigate to="/" replace />} />
          <Route path="/contabilita" element={isAdmin ? <ContabilitaPage operatore={o} /> : <Navigate to="/" replace />} />
          <Route path="/config" element={isAdmin ? <ConfigPage operatore={o} /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
