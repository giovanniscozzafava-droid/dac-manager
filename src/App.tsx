import React, { Suspense, lazy, ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginSplash from './components/LoginSplash';

function safeLazy(importFn: () => Promise<any>, exportName: string): ComponentType<any> {
  const LazyComp = lazy(async () => {
    try {
      const mod = await importFn();
      const comp = mod[exportName] || mod.default;
      if (!comp) throw new Error(exportName + ' not found');
      return { default: comp };
    } catch (e: any) {
      return { default: () => <div className="p-8 text-red-400">Errore caricamento: {e.message}</div> };
    }
  });
  return LazyComp;
}

const Dashboard = safeLazy(() => import('./pages/Dashboard'), 'Dashboard');
const Agenda = safeLazy(() => import('./pages/Agenda'), 'Agenda');
const Pazienti = safeLazy(() => import('./pages/Pazienti'), 'Pazienti');
const TaskManager = safeLazy(() => import('./pages/TaskManager'), 'TaskManager');
const Inventario = safeLazy(() => import('./pages/Inventario'), 'Inventario');
const Specialisti = safeLazy(() => import('./pages/Specialisti'), 'Specialisti');
const AnamnesiPage = safeLazy(() => import('./pages/Anamnesi'), 'AnamnesiPage');
const PacchettiPage = safeLazy(() => import('./pages/PacchettiPage'), 'PacchettiPage');
const RicaviPage = safeLazy(() => import('./pages/RicaviPage'), 'RicaviPage');
const CostiPage = safeLazy(() => import('./pages/CostiPage'), 'CostiPage');
const ParafarmaciaPage = safeLazy(() => import('./pages/ParafarmaciaPage'), 'ParafarmaciaPage');
const ContabilitaPage = safeLazy(() => import('./pages/ContabilitaPage'), 'ContabilitaPage');
const ConfigPage = safeLazy(() => import('./pages/ConfigPage'), 'ConfigPage');

const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  const { loading, operatore, authError, isAdmin, login, register, logout } = useAuth();

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
    return <LoginSplash onLogin={login} onRegister={register} error={authError} />;
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
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard operatore={o} />} />
            <Route path="/agenda" element={<Agenda operatore={o} />} />
            <Route path="/pazienti" element={<Pazienti operatore={o} />} />
            <Route path="/task" element={<TaskManager operatore={o} />} />
            <Route path="/inventario" element={<Inventario operatore={o} />} />
            <Route path="/specialisti" element={<Specialisti operatore={o} />} />
            <Route path="/anamnesi" element={<AnamnesiPage operatore={o} />} />
            <Route path="/pacchetti" element={<PacchettiPage operatore={o} />} />
            <Route path="/ricavi" element={<RicaviPage operatore={o} />} />
            <Route path="/costi" element={<CostiPage operatore={o} />} />
            <Route path="/parafarmacia" element={<ParafarmaciaPage operatore={o} />} />
            <Route path="/contabilita" element={<ContabilitaPage operatore={o} />} />
            <Route path="/config" element={<ConfigPage operatore={o} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
