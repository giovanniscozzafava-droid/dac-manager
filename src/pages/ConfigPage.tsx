import { AutomazioniPanel } from './AutomazioniPanel'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import {
  Settings, Users, ListChecks, Zap, Package, Building2, Factory,
  Plus, X, Check, Edit3, Trash2, Save, ToggleLeft, ToggleRight
} from 'lucide-react'

interface Props { operatore: Operatore }

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export function ConfigPage({ operatore }: Props) {
  const [tab, setTab] = useState<'operatori' | 'hr' | 'servizi' | 'pacchetti' | 'fornitori' | 'automazioni' | 'struttura'>('operatori')

  const TABS = [
    { id: 'operatori' as const, label: '👥 Operatori', icon: Users },
    { id: 'hr' as const, label: '💼 Contratti HR', icon: Users },
    { id: 'servizi' as const, label: '📋 Servizi & Listino', icon: ListChecks },
    { id: 'pacchetti' as const, label: '📦 Pacchetti Predefiniti', icon: Package },
    { id: 'fornitori' as const, label: '🏭 Fornitori', icon: Factory },
    { id: 'automazioni' as const, label: '⚡ Automazioni', icon: Zap },
    { id: 'struttura' as const, label: '🏥 Struttura', icon: Building2 },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={18} className="text-dac-accent" />
          <h1 className="font-display font-bold text-lg text-white">Configurazione</h1>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5
                ${tab === t.id ? 'bg-dac-accent/15 text-dac-accent' : 'text-dac-gray-400 hover:text-white hover:bg-white/5'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {tab === 'operatori' ? <OperatoriTab /> : tab === 'hr' ? <HRPlaceholder /> : tab === 'automazioni' ? <AutomazioniPanel /> : tab === 'servizi' ? <ServiziTab /> : tab === 'pacchetti' ? <PacchettiPredTab /> : tab === 'fornitori' ? <FornitoriTab /> : <StrutturaTab />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB OPERATORI
// ═══════════════════════════════════════════════════════════
function OperatoriTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('operatori').select('*').order('nome')
    setItems(data ?? []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function onSaved() { setShowForm(false); setEditItem(null); load() }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-between items-center">
        <p className="text-xs text-dac-gray-400">Gestisci il personale del centro. Operatori disattivati non compaiono in agenda e task.</p>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dac-accent text-white hover:opacity-90"><Plus size={13} /> Aggiungi</button>
      </div>
      {loading ? <Skeleton n={5} /> : items.map(op => (
        <div key={op.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${op.attivo ? 'border-white/5 bg-dac-card/50' : 'border-white/3 bg-white/[0.01] opacity-50'}`}>
          <div className="text-2xl">{op.emoji || '👤'}</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{op.nome}</div>
            <div className="text-[10px] text-dac-gray-400">{op.email || '—'} • {op.ruolo}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async () => { await supabase.from('operatori').update({ attivo: !op.attivo }).eq('id', op.id); load() }}
              className="text-dac-gray-400 hover:text-white">
              {op.attivo ? <ToggleRight size={20} className="text-dac-green" /> : <ToggleLeft size={20} />}
            </button>
            <button onClick={() => { setEditItem(op); setShowForm(true) }} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400"><Edit3 size={13} /></button>
            <button onClick={async () => { if (op.ruolo === 'admin') { alert('Non puoi eliminare un admin'); } else if (confirm(`Eliminare ${op.nome}?`)) { await supabase.from('operatori').delete().eq('id', op.id); load() } }}
              className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
      {showForm && <OperatoreForm item={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={onSaved} />}
    </div>
  )
}

function OperatoreForm({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(item?.nome ?? '')
  const [email, setEmail] = useState(item?.email ?? '')
  const [ruolo, setRuolo] = useState(item?.ruolo ?? 'operatore')
  const [emoji, setEmoji] = useState(item?.emoji ?? '👤')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim()) return; setSaving(true)
    const payload = { nome: nome.trim(), email: email || null, ruolo, emoji, attivo: true }
    if (item) await supabase.from('operatori').update(payload).eq('id', item.id)
    else await supabase.from('operatori').insert(payload)
    setSaving(false); onSaved()
  }

  return <Modal title={item ? '✏️ Modifica Operatore' : '➕ Nuovo Operatore'} onClose={onClose}>
    <div className="grid grid-cols-4 gap-3">
      <div><FL label="Emoji"><input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} className="input-field text-center text-xl" maxLength={2} /></FL></div>
      <div className="col-span-3"><FL label="Nome *"><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" autoFocus /></FL></div>
    </div>
    <FL label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" /></FL>
    <FL label="Ruolo"><select value={ruolo} onChange={e => setRuolo(e.target.value)} className="input-field"><option value="operatore">Operatore</option><option value="admin">Admin</option></select></FL>
    <Btns onClose={onClose} onSave={salva} saving={saving} disabled={!nome.trim()} />
  </Modal>
}

// ═══════════════════════════════════════════════════════════
// TAB SERVIZI & LISTINO
// ═══════════════════════════════════════════════════════════
function ServiziTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('servizi').select('*').order('reparto').order('nome')
    setItems(data ?? []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = items.filter(s => !search || (s.nome + s.reparto).toLowerCase().includes(search.toLowerCase()))
  const perReparto: Record<string, any[]> = {}
  filtered.forEach(s => { if (!perReparto[s.reparto]) perReparto[s.reparto] = []; perReparto[s.reparto].push(s) })

  function onSaved() { setShowForm(false); setEditItem(null); load() }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca servizio..."
            className="w-full pl-3 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dac-gray-400">{items.length} servizi</span>
          <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dac-accent text-white hover:opacity-90"><Plus size={13} /> Aggiungi</button>
        </div>
      </div>

      {loading ? <Skeleton n={6} /> : Object.entries(perReparto).map(([reparto, servizi]) => (
        <div key={reparto}>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-dac-gray-500 mb-2">{reparto} ({servizi.length})</h3>
          <div className="space-y-1">
            {servizi.map((s: any) => (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors ${s.attivo ? 'border-white/5 bg-dac-card/50' : 'border-white/3 opacity-40'}`}>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-white">{s.nome}</span>
                  {s.operatore_default && <span className="ml-2 text-[9px] text-dac-gray-500">({s.operatore_default})</span>}
                </div>
                <span className="text-xs font-bold text-dac-green flex-shrink-0">€{Number(s.prezzo).toLocaleString('it-IT')}</span>
                <span className="text-[9px] text-dac-gray-500 flex-shrink-0">{s.durata_minuti} min</span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={async () => { await supabase.from('servizi').update({ attivo: !s.attivo }).eq('id', s.id); load() }}
                    className="text-dac-gray-400 hover:text-white">
                    {s.attivo ? <ToggleRight size={16} className="text-dac-green" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => { setEditItem(s); setShowForm(true) }} className="p-1 rounded hover:bg-white/10 text-dac-gray-400"><Edit3 size={12} /></button>
                  <button onClick={async () => { if (confirm(`Eliminare ${s.nome}?`)) { await supabase.from('servizi').delete().eq('id', s.id); load() } }}
                    className="p-1 rounded hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showForm && <ServizioForm item={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={onSaved} />}
    </div>
  )
}

function ServizioForm({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const REPARTI = ['Laboratorio', 'Estetica', 'Med. Estetica', 'Med. Lavoro', 'Specialisti', 'Parafarmacia']
  const [nome, setNome] = useState(item?.nome ?? '')
  const [prezzo, setPrezzo] = useState(item?.prezzo ?? 0)
  const [durata, setDurata] = useState(item?.durata_minuti ?? 30)
  const [reparto, setReparto] = useState(item?.reparto ?? 'Laboratorio')
  const [operatoreDefault, setOperatoreDefault] = useState(item?.operatore_default ?? '')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim()) return; setSaving(true)
    const payload = { nome: nome.trim(), prezzo, durata_minuti: durata, reparto, operatore_default: operatoreDefault || null, attivo: true }
    if (item) await supabase.from('servizi').update(payload).eq('id', item.id)
    else await supabase.from('servizi').insert(payload)
    setSaving(false); onSaved()
  }

  return <Modal title={item ? '✏️ Modifica Servizio' : '➕ Nuovo Servizio'} onClose={onClose}>
    <FL label="Nome servizio *"><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" autoFocus /></FL>
    <div className="grid grid-cols-3 gap-3">
      <FL label="Prezzo €"><input type="number" value={prezzo} onChange={e => setPrezzo(Number(e.target.value))} className="input-field text-center" min={0} step={0.01} /></FL>
      <FL label="Durata (min)"><input type="number" value={durata} onChange={e => setDurata(Number(e.target.value))} className="input-field text-center" min={5} step={5} /></FL>
      <FL label="Reparto"><select value={reparto} onChange={e => setReparto(e.target.value)} className="input-field">{REPARTI.map(r => <option key={r} value={r}>{r}</option>)}</select></FL>
    </div>
    <FL label="Operatore default"><input type="text" value={operatoreDefault} onChange={e => setOperatoreDefault(e.target.value)} className="input-field" placeholder="Es. Teresa, V. Liuzzo..." /></FL>
    <Btns onClose={onClose} onSave={salva} saving={saving} disabled={!nome.trim()} />
  </Modal>
}

// ═══════════════════════════════════════════════════════════
// TAB PACCHETTI PREDEFINITI
// ═══════════════════════════════════════════════════════════
function PacchettiPredTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('pacchetti_predefiniti').select('*').order('nome')
    setItems(data ?? []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function onSaved() { setShowForm(false); setEditItem(null); load() }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-between items-center">
        <p className="text-xs text-dac-gray-400">Pacchetti preconfigurati da proporre ai pazienti. Appaiono nel dropdown quando crei un nuovo pacchetto.</p>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dac-accent text-white hover:opacity-90"><Plus size={13} /> Aggiungi</button>
      </div>
      {loading ? <Skeleton n={4} /> : items.length === 0 ? <div className="text-center py-12 text-dac-gray-500 text-sm">Nessun pacchetto predefinito</div>
      : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((p: any) => (
          <div key={p.id} className={`rounded-xl border p-4 transition-colors ${p.attivo ? 'border-white/5 bg-dac-card/50' : 'border-white/3 opacity-40'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">{p.nome}</h3>
                <div className="text-[10px] text-dac-gray-400">{p.servizio || '—'}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={async () => { await supabase.from('pacchetti_predefiniti').update({ attivo: !p.attivo }).eq('id', p.id); load() }}>
                  {p.attivo ? <ToggleRight size={18} className="text-dac-green" /> : <ToggleLeft size={18} className="text-dac-gray-500" />}
                </button>
                <button onClick={() => { setEditItem(p); setShowForm(true) }} className="p-1 rounded hover:bg-white/10 text-dac-gray-400"><Edit3 size={12} /></button>
                <button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('pacchetti_predefiniti').delete().eq('id', p.id); load() } }}
                  className="p-1 rounded hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-dac-gray-400">{p.sedute} sedute</span>
              <span className="font-bold text-dac-green">€{Number(p.prezzo).toLocaleString('it-IT')}</span>
              {p.validita_mesi && <span className="text-dac-gray-500">Valido {p.validita_mesi} mesi</span>}
            </div>
          </div>
        ))}
      </div>}

      {showForm && <PaccPredForm item={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={onSaved} />}
    </div>
  )
}

function PaccPredForm({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(item?.nome ?? '')
  const [servizio, setServizio] = useState(item?.servizio ?? '')
  const [sedute, setSedute] = useState(item?.sedute ?? 6)
  const [prezzo, setPrezzo] = useState(item?.prezzo ?? 0)
  const [validita, setValidita] = useState(item?.validita_mesi ?? 6)
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim()) return; setSaving(true)
    const payload = { nome: nome.trim(), servizio: servizio || null, sedute, prezzo, validita_mesi: validita, attivo: true }
    if (item) await supabase.from('pacchetti_predefiniti').update(payload).eq('id', item.id)
    else await supabase.from('pacchetti_predefiniti').insert(payload)
    setSaving(false); onSaved()
  }

  return <Modal title={item ? '✏️ Modifica Pacchetto' : '➕ Nuovo Pacchetto'} onClose={onClose}>
    <FL label="Nome pacchetto *"><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" autoFocus /></FL>
    <FL label="Servizio associato"><input type="text" value={servizio} onChange={e => setServizio(e.target.value)} className="input-field" placeholder="Es. Laser Diodo 808" /></FL>
    <div className="grid grid-cols-3 gap-3">
      <FL label="Sedute"><input type="number" value={sedute} onChange={e => setSedute(Number(e.target.value))} className="input-field text-center" min={1} /></FL>
      <FL label="Prezzo €"><input type="number" value={prezzo} onChange={e => setPrezzo(Number(e.target.value))} className="input-field text-center" min={0} /></FL>
      <FL label="Validità (mesi)"><input type="number" value={validita} onChange={e => setValidita(Number(e.target.value))} className="input-field text-center" min={1} /></FL>
    </div>
    <Btns onClose={onClose} onSave={salva} saving={saving} disabled={!nome.trim()} />
  </Modal>
}

// ═══════════════════════════════════════════════════════════
// TAB STRUTTURA
// ═══════════════════════════════════════════════════════════
function StrutturaTab() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('configurazione').select('*').then(({ data }) => {
      const map: Record<string, string> = {}
      data?.forEach((r: any) => { map[r.chiave] = r.valore })
      setConfig(map); setLoading(false)
    })
  }, [])

  function set(key: string, val: string) { setConfig(c => ({ ...c, [key]: val })); setSaved(false) }

  async function salva() {
    setSaving(true)
    for (const [chiave, valore] of Object.entries(config)) {
      await supabase.from('configurazione').upsert({ chiave, valore }, { onConflict: 'chiave' })
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <Skeleton n={8} />

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Info struttura */}
      <Section title="🏥 Dati Struttura">
        <FL label="Nome struttura"><input type="text" value={config.nome_struttura ?? ''} onChange={e => set('nome_struttura', e.target.value)} className="input-field" placeholder="Palazzo della Salute" /></FL>
        <FL label="Ragione sociale"><input type="text" value={config.ragione_sociale ?? ''} onChange={e => set('ragione_sociale', e.target.value)} className="input-field" placeholder="LABORATORI DAC S.R.L." /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="P.IVA"><input type="text" value={config.partita_iva ?? ''} onChange={e => set('partita_iva', e.target.value)} className="input-field" /></FL>
          <FL label="Codice Fiscale"><input type="text" value={config.codice_fiscale ?? ''} onChange={e => set('codice_fiscale', e.target.value)} className="input-field" /></FL>
        </div>
        <FL label="Indirizzo"><input type="text" value={config.indirizzo ?? ''} onChange={e => set('indirizzo', e.target.value)} className="input-field" placeholder="Via..." /></FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Città"><input type="text" value={config.citta ?? ''} onChange={e => set('citta', e.target.value)} className="input-field" /></FL>
          <FL label="CAP"><input type="text" value={config.cap ?? ''} onChange={e => set('cap', e.target.value)} className="input-field" /></FL>
          <FL label="Telefono"><input type="text" value={config.telefono ?? ''} onChange={e => set('telefono', e.target.value)} className="input-field" /></FL>
        </div>
      </Section>

      {/* Email */}
      <Section title="📧 Email">
        <FL label="Email accettazione (GDPR, referti)"><input type="email" value={config.email_accettazione ?? ''} onChange={e => set('email_accettazione', e.target.value)} className="input-field" placeholder="accettazione@palazzodellasalute.it" /></FL>
        <FL label="Email direzione"><input type="email" value={config.email_direzione ?? ''} onChange={e => set('email_direzione', e.target.value)} className="input-field" /></FL>
        <p className="text-[9px] text-dac-gray-500">⚠️ Le email vengono inviate tramite Supabase Edge Functions — non da account personali (fix Teresa)</p>
      </Section>

      {/* Orari */}
      <Section title="🕐 Orari Apertura">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Mattina (apertura)"><input type="time" value={config.ora_apertura_mattina ?? '08:00'} onChange={e => set('ora_apertura_mattina', e.target.value)} className="input-field" /></FL>
          <FL label="Mattina (chiusura)"><input type="time" value={config.ora_chiusura_mattina ?? '13:00'} onChange={e => set('ora_chiusura_mattina', e.target.value)} className="input-field" /></FL>
          <FL label="Pomeriggio (apertura)"><input type="time" value={config.ora_apertura_pomeriggio ?? '15:00'} onChange={e => set('ora_apertura_pomeriggio', e.target.value)} className="input-field" /></FL>
          <FL label="Pomeriggio (chiusura)"><input type="time" value={config.ora_chiusura_pomeriggio ?? '19:30'} onChange={e => set('ora_chiusura_pomeriggio', e.target.value)} className="input-field" /></FL>
        </div>
      </Section>

      {/* Salva */}
      <div className="sticky bottom-0 bg-dac-navy/90 backdrop-blur-sm py-3 border-t border-white/5">
        <button onClick={salva} disabled={saving}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all
            ${saved ? 'bg-dac-green text-white' : 'bg-dac-accent text-white hover:opacity-90'} disabled:opacity-50`}>
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : saved ? <><Check size={16} /> Salvato!</>
            : <><Save size={14} /> Salva Configurazione</>}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5"><h3 className="font-display font-bold text-white">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button></div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function FL({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">{label}</label>{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-sm font-display font-bold text-white mb-3">{title}</h3><div className="space-y-3">{children}</div></div>
}

function Btns({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
      <button onClick={onSave} disabled={saving || disabled}
        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Salva</>}
      </button>
    </div>
  )
}

function Skeleton({ n }: { n: number }) {
  return <div className="space-y-2">{Array.from({ length: n }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-white/3 animate-pulse" />)}</div>
}

// ═══════════════════════════════════════════════════════════
// TAB FORNITORI
// ═══════════════════════════════════════════════════════════
function FornitoriTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('fornitori').select('*').order('nome')
    setItems(data ?? []); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function onSaved() { setShowForm(false); setEditItem(null); load() }

  const filtered = items.filter(f => !search || (f.nome + (f.categoria ?? '') + (f.citta ?? '')).toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca fornitore..."
            className="w-full pl-3 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dac-gray-400">{items.length} fornitori</span>
          <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dac-accent text-white hover:opacity-90"><Plus size={13} /> Aggiungi</button>
        </div>
      </div>
      {loading ? <Skeleton n={5} /> : filtered.length === 0 ? <div className="text-center py-12 text-dac-gray-500 text-sm">Nessun fornitore</div>
      : <div className="space-y-2">{filtered.map(f => (
        <div key={f.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${f.attivo ? 'border-white/5 bg-dac-card/50' : 'border-white/3 bg-white/[0.01] opacity-50'}`}>
          <div className="text-2xl">🏭</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{f.nome}</div>
            <div className="text-[10px] text-dac-gray-400 truncate">
              {f.categoria ?? '—'}{f.citta ? ` • ${f.citta}` : ''}{f.telefono ? ` • ☎ ${f.telefono}` : ''}{f.email ? ` • ${f.email}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async () => { await supabase.from('fornitori').update({ attivo: !f.attivo }).eq('id', f.id); load() }}
              className="text-dac-gray-400 hover:text-white">
              {f.attivo ? <ToggleRight size={20} className="text-dac-green" /> : <ToggleLeft size={20} />}
            </button>
            <button onClick={() => { setEditItem(f); setShowForm(true) }} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400"><Edit3 size={13} /></button>
            <button onClick={async () => { if (confirm(`Eliminare ${f.nome}?`)) { await supabase.from('fornitori').delete().eq('id', f.id); load() } }}
              className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}</div>}
      {showForm && <FornitoreForm item={editItem} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={onSaved} />}
    </div>
  )
}

function FornitoreForm({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(item?.nome ?? '')
  const [partitaIva, setPartitaIva] = useState(item?.partita_iva ?? '')
  const [telefono, setTelefono] = useState(item?.telefono ?? '')
  const [email, setEmail] = useState(item?.email ?? '')
  const [indirizzo, setIndirizzo] = useState(item?.indirizzo ?? '')
  const [citta, setCitta] = useState(item?.citta ?? '')
  const [categoria, setCategoria] = useState(item?.categoria ?? '')
  const [note, setNote] = useState(item?.note ?? '')
  const [attivo, setAttivo] = useState(item?.attivo ?? true)
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim()) return; setSaving(true)
    const payload = {
      nome: nome.trim(),
      partita_iva: partitaIva || null, telefono: telefono || null, email: email || null,
      indirizzo: indirizzo || null, citta: citta || null, categoria: categoria || null,
      note: note || null, attivo,
    }
    if (item) await supabase.from('fornitori').update(payload).eq('id', item.id)
    else await supabase.from('fornitori').insert(payload)
    setSaving(false); onSaved()
  }

  return <Modal title={item ? '✏️ Modifica Fornitore' : '➕ Nuovo Fornitore'} onClose={onClose}>
    <FL label="Nome *"><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" autoFocus /></FL>
    <div className="grid grid-cols-2 gap-3">
      <FL label="P.IVA"><input type="text" value={partitaIva} onChange={e => setPartitaIva(e.target.value)} className="input-field" /></FL>
      <FL label="Categoria"><input type="text" value={categoria} onChange={e => setCategoria(e.target.value)} className="input-field" placeholder="Es. Farmaceutico, Laboratorio..." /></FL>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <FL label="Telefono"><input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="input-field" /></FL>
      <FL label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" /></FL>
    </div>
    <FL label="Indirizzo"><input type="text" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} className="input-field" /></FL>
    <FL label="Città"><input type="text" value={citta} onChange={e => setCitta(e.target.value)} className="input-field" /></FL>
    <FL label="Note"><textarea value={note} onChange={e => setNote(e.target.value)} className="input-field resize-none" rows={2} /></FL>
    <label className="flex items-center gap-2 text-xs text-dac-gray-300 cursor-pointer">
      <input type="checkbox" checked={attivo} onChange={e => setAttivo(e.target.checked)} /> Attivo
    </label>
    <Btns onClose={onClose} onSave={salva} saving={saving} disabled={!nome.trim()} />
  </Modal>
}

function HRPlaceholder() {
  return <div className="text-center py-16 text-dac-gray-500"><div className="text-4xl mb-3">💼</div><div className="text-sm">Contratti HR — in sviluppo</div></div>
}
