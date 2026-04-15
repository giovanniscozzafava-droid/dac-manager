import React from 'react';
import { useAuth } from './hooks/useAuth';
import LoginSplash from './components/LoginSplash';

export default function App() {
  const { loading, operatore, authError, login, register, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-2xl font-bold">🏥 Ciao {operatore.nome}!</h1>
      <p className="text-slate-400 mt-2">Auth funziona. Ora ricolleghiamo le pagine.</p>
      <button onClick={logout} className="mt-4 px-4 py-2 bg-red-600 rounded-lg">Logout</button>
    </div>
  );
}
