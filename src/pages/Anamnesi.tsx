import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'

interface Props { operatore: Operatore }

export function AnamnesiPage({ operatore: _ }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('anamnesi').select('*').order('created_at', { ascending: false })
        if (error) throw error
        setItems(data ?? [])
      } catch (e: any) {
        setError(e.message)
        console.error('LOAD ERROR:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div style={{ padding: 20, color: 'white' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>TEST Anamnesi</h1>
      <div style={{ marginBottom: 20, fontSize: 14 }}>
        Status: {loading ? 'Caricamento...' : error ? 'ERROR: ' + error : 'Caricato ' + items.length + ' anamnesi'}
      </div>
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(0, 20).map(a => (
            <div key={a.id} style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 'bold' }}>{a.paziente_nome || 'NO NAME'}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{a.specialista} - {a.codice}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
