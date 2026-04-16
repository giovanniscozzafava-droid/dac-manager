import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Stethoscope, Plus, X, Check, Edit3, Trash2, Calendar, DollarSign } from 'lucide-react'

interface Specialista { id: string; nome: string; specializzazione: string; email: string | null; email_referti: string | null; telefono: string | null; percentuale_struttura: number; note: string | null; attivo: boolean }
interface Disponibilita { id: string; specialista_id: string; data: string; ora_inizio: string; ora_fine: string; slot_totali: number; slot_prenotati: number; note: string | null }
interface RegistroVisita { id: string; specialista_id: string; data: string; servizio_nome: string; n_visite: number; fatturato_lordo: number; percentuale_struttura: number; importo_struttura: number; incassato: number; saldo: number; note: string | null }

interface Props { operatore: Operatore }

export function Specialisti({ operatore }: Props) {
  const [specialisti, setSpecialisti] = useState<Specialista[]>([])
  const [disponibilita, setDisponibilita] = useState<Disponibilita[]>([])
  const [registro, setRegistro] = useState<RegistroVisita[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'anagrafica' | 'disponibilita' | 'registro'>('anagrafica')
  const [showFormSpec, setShowFormSpec] = useState(false)
  const [editSpec, setEditSpec] = useState<Specialista | null>(null)
  const [showFormDisp, setShowFormDisp] = useState(false)
  const [showFormReg, setShowFormReg] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, d, r] = await Promise.all([
      supabase.from('specialisti').select('*').order('specializzazione'),
      supabase.from('disponibilita_specialisti').select('*').order('data', { ascending: true }),
      supabase.from('registro_specialisti').select('*').order('data', { ascending: false }),
    ])
    setSpecialisti(s.data ?? [])
    setDisponibilita(d.data ?? [])
    setRegistro(r.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function onSaved() { setShowFormSpec(false); setShowFormDisp(false); setShowFormReg(false); setEditSpec(null); load() }

  const TABS = [
    { id: 'anagrafica' as const, label: '📋 Anagrafica', count: specialisti.length },
    { id: 'disponibilita' as const, label: '🗓️ Disponibilità', count: disponibilita.filter(d => new Date(d.data) >= new Date()).length },
    { id: 'registro' as const, label: '💰 Registro Visite', count: registro.length },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-dac-accent" />
            <h1 className="font-display font-bold text-lg text-white">Specialisti</h1>
          </div>
          <button onClick={() => {
            if (tab === 'anagrafica') { setEditSpec(null); setShowFormSpec(true) }
            else if (tab === 'disponibilita') setShowFormDisp(true)
            else setShowFormReg(true)
          }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90 transition-opacity">
            <Plus size={14} /> {tab === 'anagrafica' ? 'Specialista' : tab === 'disponibilita' ? 'Disponibilità' : 'Visita'}
          </button>
        </div>
        <div className="flex gap-1 mt-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.id ? 'bg-dac-accent/15 text-dac-accent' : 'text-dac-gray-400 hover:text-white hover:bg-white/5'}`}>
              {t.label} <span className="ml-1 text-[10px] opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-white/3 animate-pulse" />)}</div>
        : tab === 'anagrafica' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {specialisti.map(s => (
              <div key={s.id} className="rounded-xl border border-white/5 bg-dac-card/50 p-4 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-display font-bold text-white text-sm">{s.nome}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-dac-red/10 text-dac-red">{s.specializzazione}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditSpec(s); setShowFormSpec(true) }} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400"><Edit3 size={13} /></button>
                    <button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('specialisti').delete().eq('id', s.id); load() } }} className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-dac-gray-400">
                  {s.email && <div>📧 {s.email}</div>}
                  {s.telefono && <div>📞 {s.telefono}</div>}
                  <div>💰 {(s.percentuale_struttura * 100).toFixed(0)}% struttura</div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'disponibilita' ? (
          <div className="space-y-2">
            {disponibilita.length === 0 ? <Empty text="Nessuna disponibilità inserita" /> : disponibilita.map(d => {
              const spec = specialisti.find(s => s.id === d.specialista_id)
              const isPast = new Date(d.data) < new Date()
              const liberi = d.slot_totali - d.slot_prenotati
              return (
                <div key={d.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${isPast ? 'border-white/3 opacity-50' : 'border-white/5 bg-dac-card/50 hover:border-white/10'}`}>
                  <div className="w-20 text-center">
                    <div className="text-sm font-bold text-white">{format(new Date(d.data), 'dd/MM')}</div>
                    <div className="text-[9px] text-dac-gray-500">{format(new Date(d.data), 'EEEE', { locale: it })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{spec?.specializzazione ?? '—'}</div>
                    <div className="text-[10px] text-dac-gray-400">{d.ora_inizio?.substring(0, 5)} — {d.ora_fine?.substring(0, 5)}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-bold ${liberi > 0 ? 'text-dac-green' : 'text-dac-red'}`}>{liberi}/{d.slot_totali}</div>
                    <div className="text-[8px] text-dac-gray-500">liberi</div>
                  </div>
                  <button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('disponibilita_specialisti').delete().eq('id', d.id); load() } }}
                    className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={13} /></button>
                </div>
              )
            })}
          </div>
        ) : (
          <div>
            {/* Riepilogo saldi */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {specialisti.map(s => {
                const visite = registro.filter(r => r.specialista_id === s.id)
                const totFatt = visite.reduce((sum, v) => sum + Number(v.fatturato_lordo), 0)
                const totStrutt = visite.reduce((sum, v) => sum + Number(v.importo_struttura), 0)
                const totInc = visite.reduce((sum, v) => sum + Number(v.incassato), 0)
                return (
                  <div key={s.id} className="rounded-xl border border-white/5 bg-dac-card/50 p-3">
                    <div className="text-[10px] font-semibold text-dac-gray-400 mb-1">{s.specializzazione}</div>
                    <div className="text-lg font-bold text-white">€{totStrutt.toFixed(0)}</div>
                    <div className="text-[9px] text-dac-gray-500">Strutt. su €{totFatt.toFixed(0)} fatt. | Saldo: €{(totStrutt - totInc).toFixed(0)}</div>
                  </div>
                )
              })}
            </div>
            <div className="space-y-2">
              {registro.length === 0 ? <Empty text="Nessuna visita registrata" /> : registro.map(r => {
                const spec = specialisti.find(s => s.id === r.specialista_id)
                return (
                  <div key={r.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/5 bg-dac-card/50">
                    <div className="w-16 text-xs font-mono text-dac-gray-400">{format(new Date(r.data), 'dd/MM/yy')}</div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-white">{r.servizio_nome}</div>
                      <div className="text-[10px] text-dac-gray-400">{spec?.specializzazione} • {r.n_visite} visit{r.n_visite > 1 ? 'e' : 'a'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">€{Number(r.fatturato_lordo).toFixed(0)}</div>
                      <div className="text-[9px] text-dac-green">Strutt: €{Number(r.importo_struttura).toFixed(0)}</div>
                    </div>
                    <button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('registro_specialisti').delete().eq('id', r.id); load() } }}
                      className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={13} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showFormSpec && <SpecialistaForm item={editSpec} onClose={() => { setShowFormSpec(false); setEditSpec(null) }} onSaved={onSaved} />}
      {showFormDisp && <DispForm specialisti={specialisti} onClose={() => setShowFormDisp(false)} onSaved={onSaved} />}
      {showFormReg && <RegForm specialisti={specialisti} onClose={() => setShowFormReg(false)} onSaved={onSaved} />}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-12 text-dac-gray-500 text-sm">{text}</div>
}

function SpecialistaForm({ item, onClose, onSaved }: { item: Specialista | null; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(item?.nome ?? '')
  const [spec, setSpec] = useState(item?.specializzazione ?? '')
  const [email, setEmail] = useState(item?.email ?? '')
  const [emailReferti, setEmailReferti] = useState(item?.email_referti ?? '')
  const [tel, setTel] = useState(item?.telefono ?? '')
  const [perc, setPerc] = useState(item ? item.percentuale_struttura * 100 : 20)
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim() || !spec.trim()) return
    setSaving(true)
    const payload = { nome: nome.trim(), specializzazione: spec.trim(), email: email || null, email_referti: emailReferti || null, telefono: tel || null, percentuale_struttura: perc / 100 }
    if (item) await supabase.from('specialisti').update(payload).eq('id', item.id)
    else await supabase.from('specialisti').insert({ ...payload, attivo: true })
    setSaving(false); onSaved()
  }

  return <Modal title={item ? '✏️ Modifica Specialista' : '➕ Nuovo Specialista'} onClose={onClose}>
    <Field label="Nome *"><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" placeholder="Dott. Cognome" autoFocus /></Field>
    <Field label="Specializzazione *"><input type="text" value={spec} onChange={e => setSpec(e.target.value)} className="input-field" placeholder="Endocrinologo, Dermatologo..." /></Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Email contatto"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" /></Field>
      <Field label="Telefono"><input type="tel" value={tel} onChange={e => setTel(e.target.value)} className="input-field" /></Field>
    </div>
    <Field label="📧 Email per invio referti (anamnesi)"><input type="email" value={emailReferti} onChange={e => setEmailReferti(e.target.value)} className="input-field" placeholder="specialista@dominio.it" /></Field>
    <Field label="% Struttura"><input type="number" value={perc} onChange={e => setPerc(Number(e.target.value))} className="input-field" min={0} max={100} /></Field>
    <Btns onClose={onClose} onSave={salva} saving={saving} disabled={!nome.trim() || !spec.trim()} />
  </Modal>
}

function DispForm({ specialisti, onClose, onSaved }: { specialisti: Specialista[]; onClose: () => void; onSaved: () => void }) {
  const [specId, setSpecId] = useState(specialisti[0]?.id ?? '')
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [inizio, setInizio] = useState('09:00')
  const [fine, setFine] = useState('13:00')
  const [slots, setSlots] = useState(6)
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!specId) return
    setSaving(true)
    await supabase.from('disponibilita_specialisti').insert({ specialista_id: specId, data, ora_inizio: inizio + ':00', ora_fine: fine + ':00', slot_totali: slots, slot_prenotati: 0 })
    setSaving(false); onSaved()
  }

  return <Modal title="🗓️ Nuova Disponibilità" onClose={onClose}>
    <Field label="Specialista"><select value={specId} onChange={e => setSpecId(e.target.value)} className="input-field">{specialisti.map(s => <option key={s.id} value={s.id}>{s.specializzazione} — {s.nome}</option>)}</select></Field>
    <Field label="Data"><input type="date" value={data} onChange={e => setData(e.target.value)} className="input-field" /></Field>
    <div className="grid grid-cols-3 gap-3">
      <Field label="Ora inizio"><input type="time" value={inizio} onChange={e => setInizio(e.target.value)} className="input-field" /></Field>
      <Field label="Ora fine"><input type="time" value={fine} onChange={e => setFine(e.target.value)} className="input-field" /></Field>
      <Field label="Slot totali"><input type="number" value={slots} onChange={e => setSlots(Number(e.target.value))} className="input-field" min={1} /></Field>
    </div>
    <Btns onClose={onClose} onSave={salva} saving={saving} disabled={!specId} />
  </Modal>
}

function RegForm({ specialisti, onClose, onSaved }: { specialisti: Specialista[]; onClose: () => void; onSaved: () => void }) {
  const [specId, setSpecId] = useState(specialisti[0]?.id ?? '')
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [servizio, setServizio] = useState('')
  const [nVisite, setNVisite] = useState(1)
  const [fatturato, setFatturato] = useState(0)
  const [incassato, setIncassato] = useState(0)
  const [saving, setSaving] = useState(false)
  const spec = specialisti.find(s => s.id === specId)
  const perc = spec?.percentuale_struttura ?? 0.2

  async function salva() {
    if (!specId || !servizio.trim()) return
    setSaving(true)
    await supabase.from('registro_specialisti').insert({ specialista_id: specId, data, servizio_nome: servizio.trim(), n_visite: nVisite, fatturato_lordo: fatturato, percentuale_struttura: perc, incassato })
    setSaving(false); onSaved()
  }

  return <Modal title="💰 Registra Visita" onClose={onClose}>
    <Field label="Specialista"><select value={specId} onChange={e => setSpecId(e.target.value)} className="input-field">{specialisti.map(s => <option key={s.id} value={s.id}>{s.specializzazione} — {s.nome}</option>)}</select></Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Data"><input type="date" value={data} onChange={e => setData(e.target.value)} className="input-field" /></Field>
      <Field label="N° visite"><input type="number" value={nVisite} onChange={e => setNVisite(Number(e.target.value))} className="input-field" min={1} /></Field>
    </div>
    <Field label="Servizio"><input type="text" value={servizio} onChange={e => setServizio(e.target.value)} className="input-field" placeholder="Es. Visita + Ecografia" /></Field>
    <div className="grid grid-cols-3 gap-3">
      <Field label="Fatturato €"><input type="number" value={fatturato} onChange={e => setFatturato(Number(e.target.value))} className="input-field" min={0} step={0.01} /></Field>
      <Field label={`Struttura (${(perc * 100).toFixed(0)}%)`}><div className="input-field bg-white/3 text-dac-accent font-bold">€{(fatturato * perc).toFixed(2)}</div></Field>
      <Field label="Incassato €"><input type="number" value={incassato} onChange={e => setIncassato(Number(e.target.value))} className="input-field" min={0} step={0.01} /></Field>
    </div>
    <Btns onClose={onClose} onSave={salva} saving={saving} disabled={!specId || !servizio.trim()} />
  </Modal>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-display font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">{label}</label>{children}</div>
}

function Btns({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">Annulla</button>
      <button onClick={onSave} disabled={saving || disabled}
        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2">
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Salva</>}
      </button>
    </div>
  )
}
