import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginSplash from './components/LoginSplash';
import SelectOperatore from './components/SelectOperatore';

// Pagine
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Pazienti from './pages/Pazienti';
import TaskManager from './pages/TaskManager';
import Inventario from './pages/Inventario';
import Specialisti from './pages/Specialisti';
import Anamnesi from './pages/Anamnesi';
import PacchettiPage from './pages/PacchettiPage';
import RicaviPage from './pages/RicaviPage';
import CostiPage from './pages/CostiPage';
import ParafarmaciaPage from './pages/ParafarmaciaPage';
import ContabilitaPage from './pages/ContabilitaPage';
import ConfigPage from './pages/ConfigPage';

export default function App() {
  const {
    loading,
    session,
    user,
    operatore,
    operatori,
    needsOperatoreSelection,
    isAdmin,
    loginWithGoogle,
    selectOperatore,
    cambiaOperatore,
    logout,
    logoutFull,
  } = useAuth();

  // ─── STATO 1: Loading ───
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

  // ─── STATO 2: Non autenticato → Login Google ───
  if (!session || !user) {
    return <LoginSplash onLoginGoogle={loginWithGoogle} />;
  }

  // ─── STATO 3: Autenticato ma nessun operatore selezionato ───
  if (needsOperatoreSelection || !operatore) {
    return (
      <SelectOperatore
        operatori={operatori}
        userEmail={user.email || ''}
        onSelect={selectOperatore}
        onLogout={logoutFull}
      />
    );
  }

  // ─── STATO 4: Dentro l'app ───
  return (
    <BrowserRouter>
      <Layout
        operatore={operatore}
        isAdmin={isAdmin}
        onCambiaOperatore={cambiaOperatore}
        onLogout={logout}
        onLogoutFull={logoutFull}
      >
        <Routes>
          <Route path="/" element={<Dashboard operatore={operatore} />} />
          <Route path="/agenda" element={<Agenda operatore={operatore} />} />
          <Route path="/pazienti" element={<Pazienti operatore={operatore} />} />
          <Route path="/task" element={<TaskManager operatore={operatore} isAdmin={isAdmin} />} />
          <Route path="/inventario" element={<Inventario operatore={operatore} />} />
          <Route path="/specialisti" element={<Specialisti operatore={operatore} />} />
          <Route path="/anamnesi" element={<Anamnesi operatore={operatore} />} />
          <Route path="/pacchetti" element={<PacchettiPage operatore={operatore} />} />
          <Route path="/ricavi" element={<RicaviPage operatore={operatore} />} />
          <Route path="/costi" element={<CostiPage operatore={operatore} />} />
          <Route path="/parafarmacia" element={<ParafarmaciaPage operatore={operatore} />} />
          <Route path="/contabilita" element={<ContabilitaPage operatore={operatore} />} />
          <Route path="/config" element={<ConfigPage operatore={operatore} isAdmin={isAdmin} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
