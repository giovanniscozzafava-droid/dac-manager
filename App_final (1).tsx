import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoginSplash } from '@/components/LoginSplash'
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

  if (auth.loading) return <Splash text="Caricamento..." />
  if (!auth.isAuthenticated) return <LoginSplash error="" loading={false} />
  if (!auth.isReady) return <LoginSplash error="Profilo non trovato — registrati prima oppure contatta l'admin." loading={false} />

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

function Splash({ text }: { text: string }) {
  return (
    <div className="h-screen flex items-center justify-center bg-dac-navy noise-bg">
      <div className="text-center animate-fade-in">
        <div className="text-5xl mb-4">🏥</div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">DAC Manager</h1>
        <p className="text-dac-gray-400 text-sm">{text}</p>
      </div>
    </div>
  )
}
