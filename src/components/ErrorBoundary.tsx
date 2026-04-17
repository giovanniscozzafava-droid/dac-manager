import React, { Component, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface Props { children: ReactNode; operatoreNome?: string; operatoreEmail?: string }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo)
    try {
      await supabase.from('bug_reports').insert({
        tipo: 'auto',
        severita: 'grave',
        titolo: error.message || 'Errore sconosciuto',
        descrizione: errorInfo.componentStack || '',
        pagina: window.location.pathname,
        operatore_nome: this.props.operatoreNome,
        operatore_email: this.props.operatoreEmail,
        user_agent: navigator.userAgent,
        stack_trace: error.stack,
        url: window.location.href,
        stato: 'aperto',
      })
    } catch (e) { console.error('Bug log fallito:', e) }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dac-navy p-6">
          <div className="max-w-md w-full bg-dac-card border border-dac-red/30 rounded-2xl p-6 shadow-2xl">
            <div className="text-5xl mb-4 text-center">⚠️</div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Si è verificato un errore</h2>
            <p className="text-sm text-dac-gray-300 text-center mb-4">
              Il problema è stato registrato automaticamente. L'amministratore verrà a risolverlo.
            </p>
            <div className="bg-white/5 rounded-lg p-3 mb-4">
              <p className="text-xs text-dac-gray-400 font-mono">{this.state.error?.message}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90">
                Torna alla home
              </button>
              <button onClick={() => window.location.reload()}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-white/5 text-white hover:bg-white/10">
                Ricarica pagina
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
