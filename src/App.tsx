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

export default function App() {
  const auth = useAuth()

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

  if (!auth.isAuthenticated) {
    return <LoginSplash onLoginEmail={auth.loginEmail} error={auth.error} loading={auth.loading} />
  }

  if (!auth.isReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-dac-navy noise-bg">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4">🏥</div>
          <p className="text-dac-gray-400 text-sm">Preparazione profilo...</p>
        </div>
      </div>
    )
  }

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
        <Route path="/pacchetti" element={<Placeholder title="📦 Pacchetti" />} />
        <Route path="/ricavi" element={<Placeholder title="💰 Ricavi" />} />
        <Route path="/costi" element={<Placeholder title="📉 Costi" />} />
        <Route path="/parafarmacia" element={<Placeholder title="🏪 Parafarmacia" />} />
        <Route path="/config" element={<Placeholder title="⚙️ Configurazione" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-4">{title.split(' ')[0]}</div>
        <h2 className="font-display text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-dac-gray-400">Modulo in sviluppo</p>
      </div>
    </div>
  )
}
