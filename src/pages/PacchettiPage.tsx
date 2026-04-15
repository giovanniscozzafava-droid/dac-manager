import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { Package, Plus, X, Check, Search, Edit3, Trash2 } from 'lucide-react'

interface Pacchetto {
  id: string; codice: string; paziente_id: string | null; nome_pacchetto: string; servizio_nome: string
  sedute_totali: number; sedute_fatte: number; sedute_rimaste: number; prezzo: number
  data_acquisto: string | null; scadenza: string | null; prossima_seduta: string | null
  stato: string; note: string | null
}

interface Props { operatore: Operatore }

const STATI = ['Attivo', 'Completato', 'Scaduto', 'Sospeso']
const STATO_COLORS: Record<string, { bg: string; text: string }> = {
  'Attivo': { bg: 'rgba(39,174,96,0.12)', text: '#27ae60' },
  'Completato': { bg: 'rgba(52,152,219,0.12)', text: '#3498db' },
  'Scaduto': { bg: 'rgba(231,76,60,0.12)', text: '#e74c3c' },
  'Sospeso': { bg: 'rgba(243,156,18,0.12)', text: '#f39c12' },
}

export function PacchettiPage({ operatore }: Props) {
  const [items, setItems] = useState<Pacchetto[]>([])
  const [predefiniti, setPredefiniti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStato, setFilterStato] = useState('Attivo')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Pacchetto | null>(null)
  const [selected, setSelected] = useState<Pacchetto | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [p, pre] = await Promise.all([
      supabase.from('pacchetti').select('*').order('data_acquisto', { ascending: false }),
      supabase.from('pacchetti_predefiniti').select('*').eq('attivo', true).order('nome'),
    ])
    setItems(p.data ?? []); setPredefiniti(pre.data ?? []); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(p => {
    if (filterStato && p.stato !== filterStato) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.nome_pacchetto.toLowerCase().includes(q) && !p.codice.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totAttivi = items.filter(i => i.stato === 'Attivo').length
  const totValore = items.filter(i => i.stato === 'Attivo').reduce((s, i) => s + Number(i.prezzo), 0)

  function onSaved() { setShowForm(false); setEditItem(null); setSelected(null); load() }

  async function registraSeduta(pkg: Pacchetto) { if (!confirm('Registrare seduta per ' + pkg.nome_pacchetto + '?')) return;
    if (pkg.sedute_fatte >= pkg.sedute_totali) { alert('Tutte le sedute completate'); return }
    const nuoveFatte = pkg.sedute_fatte + 1
    const nuovoStato = nuoveFatte >= pkg.sedute_totali ? 'Completato' : 'Attivo'
    await supabase.from('pacchetti').update({ sedute_fatte: nuoveFatte, sedute_rimaste: pkg.sedute_totali - nuoveFatte, stato: nuovoStato }).eq('id', pkg.id)
    load()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-dac-accent" />
            <h1 className="font-display font-bold text-lg text-white">Pacchetti</h1>
            <span className="text-xs text-dac-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{totAttivi} attivi • €{totValore.toLocaleString('it-IT')}</span>
          </div>
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90 transition-opacity">
            <Plus size={14} /> Nuovo Pacchetto
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
          </div>
          {STATI.map(s => (
            <button key={s} onClick={() => setFilterStato(filterStato === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                ${filterStato === s ? '' : 'bg-white/5 border-white/10 text-dac-gray-400 hover:text-white'}`}
              style={filterStato === s ? { background: STATO_COLORS[s].bg, borderColor: STATO_COLORS[s].text + '40', color: STATO_COLORS[s].text } : {}}>
              {s} ({items.filter(i => i.stato === s).length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/3 animate-pulse" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-16 text-dac-gray-500 text-sm">Nessun pacchetto</div>
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(p => {
            const sc = STATO_COLORS[p.stato] ?? STATO_COLORS['Attivo']
            const perc = p.sedute_totali > 0 ? (p.sedute_fatte / p.sedute_totali) * 100 : 0
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                className="rounded-xl border border-white/5 bg-dac-card/50 p-4 hover:border-white/10 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{p.nome_pacchetto}</h3>
                    <span className="text-[10px] text-dac-gray-500 font-mono">{p.codice}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: sc.bg, color: sc.text }}>{p.stato}</span>
                </div>
                <div className="text-xs text-dac-gray-400 mb-3">{p.servizio_nome}</div>
                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-dac-gray-400">{p.sedute_fatte}/{p.sedute_totali} sedute</span>
                    <span className="font-bold text-white">€{Number(p.prezzo).toLocaleString('it-IT')}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${perc}%`, background: sc.text }} />
                  </div>
                </div>
                {p.stato === 'Attivo' && (
                  <button onClick={e => { e.stopPropagation(); registraSeduta(p) }}
                    className="w-full py-1.5 rounded-lg text-[10px] font-semibold bg-dac-green/10 text-dac-green hover:bg-dac-green/20 transition-colors mt-1">
                    ✅ Registra seduta ({p.sedute_rimaste} rimaste)
                  </button>
                )}
              </div>
            )
          })}
        </div>}
      </div>

      {showForm && <PacchettoForm item={editItem} predefiniti={predefiniti} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={onSaved} />}
      {selected && !showForm && (
        <Detail p={selected} onClose={() => setSelected(null)} onEdit={() => { setEditItem(selected); setShowForm(true) }}
          onSeduta={() => { registraSeduta(selected); setSelected(null) }} onDeleted={onSaved} />
      )}
    </div>
  )
}

function PacchettoForm({ item, predefiniti, onClose, onSaved }: { item: Pacchetto | null; predefiniti: any[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!item
  const [pazSearch, setPazSearch] = useState('')
  const [pazienti, setPazienti] = useState<any[]>([])
  const [selPaz, setSelPaz] = useState<any>(null)
  const [nomePkg, setNomePkg] = useState(item?.nome_pacchetto ?? '')
  const [servizio, setServizio] = useState(item?.servizio_nome ?? '')
  const [seduteTot, setSeduteTot] = useState(item?.sedute_totali ?? 6)
  const [seduteFatte, setSeduteFatte] = useState(item?.sedute_fatte ?? 0)
  const [prezzo, setPrezzo] = useState(item?.prezzo ?? 0)
  const [scadenza, setScadenza] = useState(item?.scadenza ?? '')
  const [note, setNote] = useState(item?.note ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (pazSearch.length < 2) { setPazienti([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('pazienti').select('id, cognome, nome').or(`cognome.ilike.%${pazSearch}%,nome.ilike.%${pazSearch}%`).limit(6)
      setPazienti(data ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [pazSearch])

  function selPredefinito(nome: string) {
    const p = predefiniti.find(x => x.nome === nome)
    if (p) { setNomePkg(p.nome); setSeduteTot(p.sedute); setPrezzo(p.prezzo) }
  }

  async function salva() {
    if (!nomePkg.trim()) return
    setSaving(true)
    const payload: any = {
      nome_pacchetto: nomePkg, servizio_nome: servizio || nomePkg,
      sedute_totali: seduteTot, sedute_fatte: seduteFatte, prezzo,
      scadenza: scadenza || null, note: note || null, stato: seduteFatte >= seduteTot ? 'Completato' : 'Attivo',
    }
    if (isEdit) { await supabase.from('pacchetti').update(payload).eq('id', item!.id) }
    else {
      payload.codice = 'PKG-' + format(new Date(), 'yyMMddHHmmss')
      payload.paziente_id = selPaz?.id ?? null
      payload.data_acquisto = format(new Date(), 'yyyy-MM-dd')
      await supabase.from('pacchetti').insert(payload)
    }
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[85vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5"><h3 className="font-display font-bold text-white">{isEdit ? '✏️ Modifica' : '➕ Nuovo Pacchetto'}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button></div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!isEdit && <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Paziente</label>
            {selPaz ? <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-dac-teal/10 border border-dac-teal/20"><span className="text-sm font-semibold text-white">{selPaz.cognome} {selPaz.nome}</span><button onClick={() => setSelPaz(null)} className="text-dac-gray-400"><X size={14} /></button></div>
            : <div className="relative"><input type="text" value={pazSearch} onChange={e => setPazSearch(e.target.value)} className="input-field" placeholder="Cerca paziente..." />
              {pazienti.length > 0 && <div className="absolute top-full left-0 right-0 mt-1 bg-dac-deep border border-white/10 rounded-xl shadow-2xl z-10 max-h-40 overflow-y-auto">{pazienti.map(p => <button key={p.id} onClick={() => { setSelPaz(p); setPazienti([]) }} className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm text-white">{p.cognome} {p.nome}</button>)}</div>}</div>}
          </div>}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Pacchetto predefinito</label>
            <select onChange={e => selPredefinito(e.target.value)} className="input-field"><option value="">Personalizzato</option>{predefiniti.map(p => <option key={p.id} value={p.nome}>{p.nome} — €{p.prezzo} ({p.sedute} sed.)</option>)}</select>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Nome *</label><input type="text" value={nomePkg} onChange={e => setNomePkg(e.target.value)} className="input-field" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-[9px] text-dac-gray-400 mb-1">Sedute tot.</label><input type="number" value={seduteTot} onChange={e => setSeduteTot(Number(e.target.value))} className="input-field text-center" min={1} /></div>
            <div><label className="block text-[9px] text-dac-gray-400 mb-1">Fatte</label><input type="number" value={seduteFatte} onChange={e => setSeduteFatte(Number(e.target.value))} className="input-field text-center" min={0} /></div>
            <div><label className="block text-[9px] text-dac-gray-400 mb-1">Prezzo €</label><input type="number" value={prezzo} onChange={e => setPrezzo(Number(e.target.value))} className="input-field text-center" min={0} /></div>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Scadenza</label><input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} className="input-field" /></div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label><textarea value={note} onChange={e => setNote(e.target.value)} className="input-field resize-none" rows={2} /></div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || !nomePkg.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Salva</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Detail({ p, onClose, onEdit, onSeduta, onDeleted }: { p: Pacchetto; onClose: () => void; onEdit: () => void; onSeduta: () => void; onDeleted: () => void }) {
  const sc = STATO_COLORS[p.stato] ?? STATO_COLORS['Attivo']
  const perc = p.sedute_totali > 0 ? (p.sedute_fatte / p.sedute_totali) * 100 : 0
  return (
    <><div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
    <div className="fixed top-0 right-0 z-50 w-80 h-full bg-dac-card border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-2"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: sc.bg, color: sc.text }}>{p.stato}</span><div className="flex gap-1"><button onClick={onEdit} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400"><Edit3 size={14} /></button><button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400"><X size={16} /></button></div></div>
        <h3 className="font-display font-bold text-white">{p.nome_pacchetto}</h3>
        <div className="text-xs text-dac-gray-400 mt-1">{p.servizio_nome}</div>
        <div className="mt-3 mb-1 flex justify-between text-[10px]"><span className="text-dac-gray-400">{p.sedute_fatte}/{p.sedute_totali} sedute</span><span className="font-bold text-white">€{Number(p.prezzo).toLocaleString('it-IT')}</span></div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${perc}%`, background: sc.text }} /></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <DR label="Codice" value={p.codice} />
        <DR label="Acquisto" value={p.data_acquisto ? format(new Date(p.data_acquisto), 'dd/MM/yyyy') : '—'} />
        {p.scadenza && <DR label="Scadenza" value={format(new Date(p.scadenza), 'dd/MM/yyyy')} />}
        <DR label="Rimaste" value={String(p.sedute_rimaste)} />
        {p.note && <DR label="Note" value={p.note} />}
        {p.stato === 'Attivo' && <button onClick={onSeduta} className="w-full py-2 rounded-xl text-xs font-semibold bg-dac-green/10 text-dac-green hover:bg-dac-green/20 mt-2">✅ Registra seduta</button>}
      </div>
      <div className="p-4 border-t border-white/5"><button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('pacchetti').delete().eq('id', p.id); onDeleted() } }} className="w-full py-2 rounded-xl text-xs font-semibold text-dac-red bg-dac-red/10 hover:bg-dac-red/20">🗑️ Elimina</button></div>
    </div></>
  )
}

function DR({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between items-start py-1 border-b border-white/[0.03]"><span className="text-[10px] text-dac-gray-500">{label}</span><span className="text-xs text-white text-right max-w-[60%]">{value}</span></div>
}
