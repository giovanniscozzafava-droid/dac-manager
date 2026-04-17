import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Bug, Plus, X, Check, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react'

interface Props { operatore: Operatore }

interface BugReport {
  id: string
  tipo: string
  severita: string
  titolo: string
  descrizione: string | null
  pagina: string | null
  operatore_nome: string | null
  operatore_email: string | null
  stato: string
  note_admin: string | null
  created_at: string
  risolto_at: string | null
}

export function BugReports({ operatore }: Props) {
  const [items, setItems] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'tutti' | 'aperti' | 'miei' | 'risolti'>('aperti')
  const isAdmin = operatore.ruolo === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('bug_reports').select('*').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('operatore_email', operatore.email)
    const { data } = await query
    setItems(data ?? [])
    setLoading(false)
  }, [operatore.email, isAdmin])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(b => {
    if (filter === 'aperti') return b.stato === 'aperto' || b.stato === 'in_lavorazione'
    if (filter === 'risolti') return b.stato === 'risolto' || b.stato === 'chiuso'
    if (filter === 'miei') return b.operatore_email === operatore.email
    return true
  })

  function exportCSV() {
    const headers = ['Data', 'Titolo', 'Descrizione', 'Gravità', 'Stato', 'Operatore', 'Email', 'Pagina', 'Tipo', 'Note Admin', 'Risolto il']
    const rows = filtered.map(b => [
      format(new Date(b.created_at), 'dd/MM/yyyy HH:mm'),
      (b.titolo || '').replace(/"/g, '""'),
      (b.descrizione || '').replace(/"/g, '""').replace(/\n/g, ' '),
      b.severita,
      b.stato,
      b.operatore_nome || '',
      b.operatore_email || '',
      b.pagina || '',
      b.tipo,
      (b.note_admin || '').replace(/"/g, '""').replace(/\n/g, ' '),
      b.risolto_at ? format(new Date(b.risolto_at), 'dd/MM/yyyy HH:mm') : '',
    ])
    const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bug_reports_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Bug size={18} className="text-dac-orange" />
            <h1 className="font-display font-bold text-lg text-white">Segnalazioni Bug</h1>
            <span className="text-xs text-dac-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && filtered.length > 0 && (
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 text-white hover:bg-white/10">
                <Download size={13} /> Esporta CSV
              </button>
            )}
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-orange text-white hover:opacity-90">
              <Plus size={14} /> Segnala Bug
            </button>
          </div>
        </div>
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {[
            { id: 'aperti', label: '🔴 Aperti' },
            { id: 'miei', label: '👤 Miei' },
            { id: 'risolti', label: '✅ Risolti' },
            { id: 'tutti', label: '📋 Tutti' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${filter === f.id ? 'bg-dac-orange/15 text-dac-orange' : 'text-dac-gray-400 hover:bg-white/5'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/3 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-dac-gray-500 text-sm">Nessuna segnalazione</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(b => <BugCard key={b.id} bug={b} isAdmin={isAdmin} onUpdate={load} />)}
          </div>
        )}
      </div>

      {showForm && <BugForm operatore={operatore} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function BugCard({ bug, isAdmin, onUpdate }: { bug: BugReport; isAdmin: boolean; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notaAdmin, setNotaAdmin] = useState(bug.note_admin || '')
  const [editNota, setEditNota] = useState(false)

  const severitaColor: Record<string, string> = { basso: 'text-dac-gray-400', medio: 'text-dac-orange', grave: 'text-dac-red', critico: 'text-dac-red' }
  const statoIcon = bug.stato === 'risolto' || bug.stato === 'chiuso' ? <CheckCircle size={14} className="text-dac-green" /> : bug.stato === 'in_lavorazione' ? <Clock size={14} className="text-dac-orange" /> : <AlertCircle size={14} className="text-dac-red" />
  const statoLabel: Record<string, string> = { aperto: 'Aperto', in_lavorazione: 'In lavorazione', risolto: 'Risolto', chiuso: 'Chiuso' }

  async function cambiaStato(nuovoStato: string) {
    if (!notaAdmin.trim() && (nuovoStato === 'risolto' || nuovoStato === 'chiuso')) {
      alert('Scrivi una nota di risposta prima di chiudere')
      setEditNota(true)
      return
    }
    setSaving(true)
    const payload: any = { stato: nuovoStato, note_admin: notaAdmin.trim() || null }
    if (nuovoStato === 'risolto' || nuovoStato === 'chiuso') payload.risolto_at = new Date().toISOString()
    await supabase.from('bug_reports').update(payload).eq('id', bug.id)
    setSaving(false)
    setEditNota(false)
    onUpdate()
  }

  async function salvaNota() {
    setSaving(true)
    await supabase.from('bug_reports').update({ note_admin: notaAdmin.trim() || null }).eq('id', bug.id)
    setSaving(false)
    setEditNota(false)
    onUpdate()
  }

  return (
    <div className="rounded-xl border border-white/5 bg-dac-card/50 p-3 hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-shrink-0 pt-0.5">{statoIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white">{bug.titolo}</span>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-white/5 ${severitaColor[bug.severita] || 'text-dac-gray-400'}`}>{bug.severita}</span>
            <span className="text-[9px] text-dac-gray-500">{bug.tipo === 'auto' ? '🤖 Auto' : '👤 Manuale'}</span>
            {bug.note_admin && bug.stato !== 'risolto' && bug.stato !== 'chiuso' && (
              <span className="text-[9px] bg-dac-accent/15 text-dac-accent px-1.5 py-0.5 rounded-full">💬 Risposta admin</span>
            )}
          </div>
          <div className="text-[10px] text-dac-gray-400">
            {statoLabel[bug.stato] || bug.stato} • {bug.operatore_nome ?? '-'} • {bug.pagina ?? '-'} • {format(new Date(bug.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 pl-6">
          {bug.descrizione && <div className="text-xs text-dac-gray-300 bg-white/3 p-2 rounded-lg whitespace-pre-wrap">{bug.descrizione}</div>}

          {bug.note_admin && !editNota && (
            <div className="text-xs text-dac-accent bg-dac-accent/5 p-2 rounded-lg border border-dac-accent/20">
              <div className="flex items-center gap-1 mb-1">
                <strong>💬 Risposta admin:</strong>
                {bug.risolto_at && <span className="text-[10px] text-dac-green">• Risolto il {format(new Date(bug.risolto_at), 'dd/MM/yyyy HH:mm')}</span>}
              </div>
              <div className="whitespace-pre-wrap">{bug.note_admin}</div>
            </div>
          )}

          {isAdmin && (
            <>
              {editNota ? (
                <div className="space-y-2">
                  <textarea value={notaAdmin} onChange={e => setNotaAdmin(e.target.value)}
                    className="input-field resize-none w-full" rows={3}
                    placeholder="Scrivi come hai risolto il problema..." autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => { setEditNota(false); setNotaAdmin(bug.note_admin || '') }}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold bg-white/5 text-dac-gray-300">Annulla</button>
                    <button onClick={salvaNota} disabled={saving}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold bg-dac-accent text-white hover:opacity-90">
                      {saving ? '...' : 'Salva nota'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setEditNota(true)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-dac-accent/15 text-dac-accent hover:bg-dac-accent/25">
                    {bug.note_admin ? '✏️ Modifica nota' : '💬 Scrivi risposta'}
                  </button>
                  {bug.stato !== 'in_lavorazione' && bug.stato !== 'risolto' && bug.stato !== 'chiuso' && (
                    <button onClick={() => cambiaStato('in_lavorazione')} disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-dac-orange/15 text-dac-orange hover:bg-dac-orange/25">In lavorazione</button>
                  )}
                  {bug.stato !== 'risolto' && bug.stato !== 'chiuso' && (
                    <button onClick={() => cambiaStato('risolto')} disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-dac-green/15 text-dac-green hover:bg-dac-green/25">✓ Risolto</button>
                  )}
                  {(bug.stato === 'risolto' || bug.stato === 'chiuso') && (
                    <button onClick={() => cambiaStato('aperto')} disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/5 text-dac-gray-300">Riapri</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BugForm({ operatore, onClose, onSaved }: { operatore: Operatore; onClose: () => void; onSaved: () => void }) {
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [severita, setSeverita] = useState('medio')
  const [pagina, setPagina] = useState(window.location.pathname)
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!titolo.trim()) { alert('Titolo obbligatorio'); return }
    setSaving(true)
    const { error } = await supabase.from('bug_reports').insert({
      tipo: 'manuale', severita, titolo: titolo.trim(), descrizione: descrizione.trim() || null,
      pagina, operatore_nome: operatore.nome, operatore_email: operatore.email,
      user_agent: navigator.userAgent, url: window.location.href, stato: 'aperto',
    })
    setSaving(false)
    if (error) { alert('Errore: ' + error.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-display font-bold text-white">🐛 Segnala un bug</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="px-3 py-2 rounded-lg bg-dac-accent/5 border border-dac-accent/10 text-[11px] text-dac-gray-300">
            Descrivi il problema riscontrato. L'amministratore riceverà la segnalazione e interverrà al più presto.
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Titolo *</label>
            <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)} className="input-field" placeholder="Es. Non riesco a salvare il paziente" autoFocus />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Descrizione dettagliata</label>
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} className="input-field resize-none" rows={5}
              placeholder="Cosa stavi facendo? Cosa ti aspettavi? Cosa è successo invece?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Gravità</label>
              <select value={severita} onChange={e => setSeverita(e.target.value)} className="input-field">
                <option value="basso">🟢 Basso (fastidio)</option>
                <option value="medio">🟡 Medio (limitante)</option>
                <option value="grave">🟠 Grave (blocca lavoro)</option>
                <option value="critico">🔴 Critico (sistema inutilizzabile)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Pagina</label>
              <input type="text" value={pagina} onChange={e => setPagina(e.target.value)} className="input-field" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || !titolo.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-orange text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Invia segnalazione</>}
          </button>
        </div>
      </div>
    </div>
  )
}
