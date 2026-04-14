import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoginSplash } from '@/components/LoginSplash'
import { Onboarding } from '@/components/Onboarding'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Agenda } from '@/pages/Agenda'
import { Pazienti } from '@/pages/Pazienti'
import { TaskManager } from '@/pages/TaskManager'
import { Inventario } from '@/pages/Inventario'
import { Specialisti } from '@/pages/Specialisti'
import { AnamnesiPage } from '@/pages/Anamnesi'
import { PacchettiPage } from '@/pages/PacchettiPage'
import { RicaviPage } from '@/pages/RicaviPage'
import { CostiPage } from '@/pages/CostiPage'
import { ParafarmaciaPage } from '@/pages/ParafarmaciaPage'
import { ContabilitaPage } from '@/pages/ContabilitaPage'
import { ConfigPage } from '@/pages/ConfigPage'

export default function App() {
  const auth = useAuth()

  // 1. Loading
  if (auth.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dac-navy noise-bg">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4">🏥</div>
          <h1 className="font-display text-2xl font-bold text-white mb-2">DAC Manager</h1>
          <p className="text-dac-gray-400 text-sm">Caricamento...</p>
        </div>
      </div>
    )
  }

  // 2. Non autenticato → Login
  if (!auth.isAuthenticated) return <LoginSplash />

  // 3. Autenticato ma nessun profilo operatore → errore (l'admin deve creare l'operatore)
  if (!auth.hasProfile) {
    return (
      <div className="h-screen flex items-center justify-center bg-dac-navy noise-bg">
        <div className="text-center animate-fade-in max-w-sm mx-4">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-display text-lg font-bold text-white mb-2">Accesso non configurato</h2>
          <p className="text-dac-gray-400 text-sm mb-4">
            Il tuo account esiste ma non sei ancora stato aggiunto come operatore.<br />
            Contatta l'amministratore per essere abilitato.
          </p>
          <button onClick={auth.logout}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">
            ← Esci
          </button>
        </div>
      </div>
    )
  }

  // 4. Profilo presente ma non completo → Onboarding
  if (!auth.isReady) {
    return (
      <Onboarding
        operatoreId={auth.operatore!.id}
        email={auth.session?.user?.email ?? ''}
        onCompleted={auth.refresh}
      />
    )
  }

  // 5. Tutto ok → App
  return (
    <Layout operatore={auth.operatore!} onLogout={auth.logout} onLogoutFull={auth.logout}>
      <Routes>
        <Route path="/" element={<Dashboard operatore={auth.operatore!} />} />
        <Route path="/agenda" element={<Agenda operatore={auth.operatore!} />} />
        <Route path="/pazienti" element={<Pazienti operatore={auth.operatore!} />} />
        <Route path="/task" element={<TaskManager operatore={auth.operatore!} />} />
        <Route path="/inventario" element={<Inventario operatore={auth.operatore!} />} />
        <Route path="/specialisti" element={<Specialisti operatore={auth.operatore!} />} />
        <Route path="/anamnesi" element={<AnamnesiPage operatore={auth.operatore!} />} />
        <Route path="/pacchetti" element={<PacchettiPage operatore={auth.operatore!} />} />
        <Route path="/ricavi" element={<RicaviPage operatore={auth.operatore!} />} />
        <Route path="/costi" element={<CostiPage operatore={auth.operatore!} />} />
        <Route path="/parafarmacia" element={<ParafarmaciaPage operatore={auth.operatore!} />} />
        <Route path="/contabilita" element={<ContabilitaPage operatore={auth.operatore!} />} />
        <Route path="/config" element={<ConfigPage operatore={auth.operatore!} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
