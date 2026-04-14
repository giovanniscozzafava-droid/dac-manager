import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format, addDays, subDays, isToday, isBefore, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, X, Clock,
  User, Stethoscope, Check, AlertTriangle, Ban, Search
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const ORARI_MATTINA = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00']
const ORARI_POMERIGGIO = ['15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30']
const TUTTI_ORARI = [...ORARI_MATTINA, 'PAUSA', ...ORARI_POMERIGGIO]

const COLONNE_AGENDA = [
  { nome: 'Teresa', area: 'Lab Analisi (1°P)', colore: '#27ae60', bg: 'rgba(39,174,96,0.08)', icon: '🔬' },
  { nome: 'V. Liuzzo', area: 'Cab. Laser/Viso (2°P)', colore: '#3498db', bg: 'rgba(52,152,219,0.08)', icon: '👩‍🔬' },
  { nome: 'Agnese', area: 'Cab. Corpo/Mani (2°P)', colore: '#8e44ad', bg: 'rgba(142,68,173,0.08)', icon: '💅' },
  { nome: 'Specialisti', area: 'Ambulatorio (2°P)', colore: '#e74c3c', bg: 'rgba(231,76,60,0.08)', icon: '🩺' },
  { nome: 'Butera', area: 'Platon/Parafarmacia', colore: '#f39c12', bg: 'rgba(243,156,18,0.08)', icon: '💊' },
  { nome: 'Valentina C', area: 'Ambulatorio (2°P)', colore: '#ff9800', bg: 'rgba(255,152,0,0.08)', icon: '🩺' },
]

// Turni: M=mattina, P=pomeriggio, T=tutto, B=butera, X=assente
// Indice: 0=Lun, 1=Mar, 2=Mer, 3=Gio, 4=Ven, 5=Sab
const TURNI: Record<string, string[]> = {
  'Teresa':      ['M','M','M','M','M','X'],
  'V. Liuzzo':   ['P','T','T','P','P','X'],
  'Agnese':      ['P','T','T','P','P','X'],
  'Specialisti': ['T','T','T','T','T','X'],
  'Butera':      ['B','B','B','B','B','M'],
  'Valentina C': ['T','T','T','T','T','X'],
}

const STATO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'Prenotato':  { bg: 'rgba(52,152,219,0.15)', text: '#3498db', label: '🟢' },
  'Confermato': { bg: 'rgba(46,134,193,0.15)', text: '#2e86c1', label: '🔵' },
  'In corso':   { bg: 'rgba(243,156,18,0.15)', text: '#f39c12', label: '🟡' },
  'Completato': { bg: 'rgba(39,174,96,0.15)',  text: '#27ae60', label: '✅' },
  'No-show':    { bg: 'rgba(231,76,60,0.15)',  text: '#e74c3c', label: '🔴' },
  'Cancellato': { bg: 'rgba(149,165,166,0.15)', text: '#95a5a6', label: '⚪' },
}

interface Appuntamento {
  id: string
  paziente_nome: string
  servizio_nome: string
  operatore_nome: string
  ora: string
  stato: string
  note: string | null
  colonna_agenda: number | null
  paziente_id: string | null
  durata_minuti: number
}

interface Props {
  operatore: Operatore
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
export function Agenda({ operatore }: Props) {
  const [data, setData] = useState(startOfDay(new Date()))
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ ora: string; colIdx: number } | null>(null)
  const [selectedApp, setSelectedApp] = useState<Appuntamento | null>(null)

  const dataStr = format(data, 'yyyy-MM-dd')
  const giornoSett = (data.getDay() + 6) % 7 // 0=Lun, 6=Dom

  // ── Load appuntamenti ──
  const loadAppuntamenti = useCallback(async () => {
    setLoading(true)
    const { data: apps } = await supabase
      .from('appuntamenti')
      .select('*')
      .eq('data', dataStr)
      .order('ora')

    setAppuntamenti(apps ?? [])
    setLoading(false)
  }, [dataStr])

  useEffect(() => { loadAppuntamenti() }, [loadAppuntamenti])

  // ── Realtime ──
  useEffect(() => {
    const channel = supabase
      .channel('agenda-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appuntamenti',
        filter: `data=eq.${dataStr}`,
      }, () => {
        loadAppuntamenti()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [dataStr, loadAppuntamenti])

  // ── Navigazione ──
  const goPrec = () => setData(d => subDays(d, 1))
  const goOggi = () => setData(startOfDay(new Date()))
  const goSucc = () => setData(d => addDays(d, 1))
  const goData = (val: string) => setData(startOfDay(new Date(val)))

  // ── Turno check ──
  function isDisponibile(operatoreNome: string, ora: string): boolean {
    if (giornoSett === 6) return false // Domenica
    const turno = TURNI[operatoreNome]?.[giornoSett] ?? 'X'
    if (turno === 'X') return false
    if (turno === 'T' || turno === 'B') return true
    const isMat = ORARI_MATTINA.includes(ora)
    const isPom = ORARI_POMERIGGIO.includes(ora)
    if (turno === 'M' && isMat) return true
    if (turno === 'P' && isPom) return true
    if ((turno === 'MT' || turno === 'MP') && (isMat || isPom)) return true
    return false
  }

  // ── Trova appuntamento per slot ──
  function getAppuntamento(ora: string, colIdx: number): Appuntamento | undefined {
    const opNome = COLONNE_AGENDA[colIdx]?.nome
    return appuntamenti.find(a => {
      const appOra = a.ora?.substring(0, 5)
      return appOra === ora && (a.operatore_nome === opNome || a.colonna_agenda === colIdx + 2)
    })
  }

  // ── Click slot ──
  function onSlotClick(ora: string, colIdx: number) {
    const app = getAppuntamento(ora, colIdx)
    if (app) {
      setSelectedApp(app)
    } else {
      const opNome = COLONNE_AGENDA[colIdx]?.nome
      if (isDisponibile(opNome, ora)) {
        setSelectedSlot({ ora, colIdx })
        setShowModal(true)
      }
    }
  }

  // ── Cambio stato rapido ──
  async function cambiaStato(appId: string, nuovoStato: string) {
    await supabase.from('appuntamenti').update({ stato: nuovoStato }).eq('id', appId)
    setSelectedApp(null)
    loadAppuntamenti()
  }

  const isPast = isBefore(data, startOfDay(new Date()))

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-dac-accent" />
          <h1 className="font-display font-bold text-lg text-white">Agenda</h1>
        </div>

        {/* Nav data */}
        <div className="flex items-center gap-2">
          <button onClick={goPrec} className="p-2 rounded-lg hover:bg-white/5 text-dac-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goOggi}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${isToday(data) ? 'bg-dac-accent text-white' : 'bg-white/5 text-dac-gray-300 hover:bg-white/10'}`}>
            Oggi
          </button>
          <button onClick={goSucc} className="p-2 rounded-lg hover:bg-white/5 text-dac-gray-400 hover:text-white transition-colors">
            <ChevronRight size={18} />
          </button>
          <input type="date" value={dataStr} onChange={e => goData(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-dac-accent/50" />
        </div>

        {/* Data display */}
        <div className="text-right">
          <div className="font-display font-bold text-white text-sm">
            {format(data, "EEEE d MMMM yyyy", { locale: it })}
          </div>
          <div className="text-[10px] text-dac-gray-400">
            {appuntamenti.length} appuntament{appuntamenti.length !== 1 ? 'i' : 'o'}
            {isPast && <span className="ml-2 text-dac-gray-500">(passato)</span>}
          </div>
        </div>
      </div>

      {/* ── GRIGLIA ── */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[900px]">
          {/* Header colonne */}
          <div className="flex sticky top-0 z-20 bg-dac-navy border-b border-white/10">
            <div className="w-16 flex-shrink-0 p-2 text-center">
              <Clock size={12} className="mx-auto text-dac-gray-500" />
            </div>
            {COLONNE_AGENDA.map((col, i) => (
              <div key={col.nome} className="flex-1 p-2 text-center border-l border-white/5"
                style={{ background: col.bg }}>
                <div className="text-sm font-bold" style={{ color: col.colore }}>{col.icon} {col.nome}</div>
                <div className="text-[9px] text-dac-gray-500">{col.area}</div>
              </div>
            ))}
          </div>

          {/* Righe orari */}
          {TUTTI_ORARI.map((ora) => {
            if (ora === 'PAUSA') {
              return (
                <div key="pausa" className="flex bg-dac-deep/50 border-y border-white/5">
                  <div className="w-16 flex-shrink-0" />
                  <div className="flex-1 text-center py-1.5 text-[10px] text-dac-gray-500 font-semibold tracking-widest">
                    ── PAUSA PRANZO ──
                  </div>
                </div>
              )
            }

            return (
              <div key={ora} className="flex border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                {/* Ora */}
                <div className="w-16 flex-shrink-0 py-2.5 text-center text-[11px] font-mono font-bold text-dac-gray-400 border-r border-white/5">
                  {ora}
                </div>

                {/* Slot operatori */}
                {COLONNE_AGENDA.map((col, colIdx) => {
                  const disp = isDisponibile(col.nome, ora)
                  const app = getAppuntamento(ora, colIdx)

                  if (!disp) {
                    return (
                      <div key={colIdx} className="flex-1 border-l border-white/[0.03] bg-white/[0.01] flex items-center justify-center">
                        <span className="text-[9px] text-dac-gray-500/30 italic">—</span>
                      </div>
                    )
                  }

                  if (app) {
                    const stato = STATO_COLORS[app.stato] ?? STATO_COLORS['Prenotato']
                    return (
                      <div key={colIdx}
                        onClick={() => onSlotClick(ora, colIdx)}
                        className="flex-1 border-l border-white/[0.03] p-1 cursor-pointer group"
                      >
                        <div className="rounded-lg px-2 py-1.5 transition-all group-hover:scale-[1.02] group-hover:shadow-lg"
                          style={{ background: stato.bg, borderLeft: `3px solid ${stato.text}` }}>
                          <div className="text-[11px] font-semibold text-white truncate">
                            {app.paziente_nome}
                          </div>
                          <div className="text-[9px] truncate" style={{ color: stato.text }}>
                            {app.servizio_nome}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // Slot libero
                  return (
                    <div key={colIdx}
                      onClick={() => onSlotClick(ora, colIdx)}
                      className="flex-1 border-l border-white/[0.03] cursor-pointer group hover:bg-dac-accent/5 transition-colors flex items-center justify-center"
                    >
                      <Plus size={12} className="text-dac-gray-500/0 group-hover:text-dac-accent/40 transition-all" />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── LEGENDA ── */}
      <div className="flex items-center gap-4 px-4 lg:px-6 py-2 border-t border-white/5 flex-shrink-0 flex-wrap">
        {Object.entries(STATO_COLORS).map(([nome, s]) => (
          <div key={nome} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: s.text }} />
            <span className="text-[10px] text-dac-gray-400">{nome}</span>
          </div>
        ))}
      </div>

      {/* ── MODAL NUOVO APPUNTAMENTO ── */}
      {showModal && selectedSlot && (
        <NuovoAppuntamentoModal
          data={dataStr}
          ora={selectedSlot.ora}
          operatoreNome={COLONNE_AGENDA[selectedSlot.colIdx]?.nome ?? ''}
          colIdx={selectedSlot.colIdx}
          onClose={() => { setShowModal(false); setSelectedSlot(null) }}
          onSaved={() => { setShowModal(false); setSelectedSlot(null); loadAppuntamenti() }}
        />
      )}

      {/* ── PANEL DETTAGLIO APPUNTAMENTO ── */}
      {selectedApp && (
        <DettaglioAppuntamento
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onCambiaStato={cambiaStato}
          onDeleted={() => { setSelectedApp(null); loadAppuntamenti() }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MODAL: Nuovo Appuntamento
// ═══════════════════════════════════════════════════════════
function NuovoAppuntamentoModal({ data, ora, operatoreNome, colIdx, onClose, onSaved }: {
  data: string; ora: string; operatoreNome: string; colIdx: number
  onClose: () => void; onSaved: () => void
}) {
  const [pazienteSearch, setPazienteSearch] = useState('')
  const [pazienti, setPazienti] = useState<any[]>([])
  const [selectedPaz, setSelectedPaz] = useState<any>(null)
  const [servizi, setServizi] = useState<any[]>([])
  const [selectedSrv, setSelectedSrv] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [manualName, setManualName] = useState('')

  // Carica servizi
  useEffect(() => {
    supabase.from('servizi').select('*').eq('attivo', true).order('nome').then(({ data }) => setServizi(data ?? []))
  }, [])

  // Ricerca pazienti
  useEffect(() => {
    if (pazienteSearch.length < 2) { setPazienti([]); return }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('pazienti')
        .select('id, codice, cognome, nome, telefono')
        .or(`cognome.ilike.%${pazienteSearch}%,nome.ilike.%${pazienteSearch}%,codice_fiscale.ilike.%${pazienteSearch}%`)
        .limit(8)
      setPazienti(data ?? [])
    }, 300)
    return () => clearTimeout(timeout)
  }, [pazienteSearch])

  async function salva() {
    const pazNome = selectedPaz ? `${selectedPaz.cognome} ${selectedPaz.nome}` : manualName.trim()
    if (!pazNome || !selectedSrv) return

    setSaving(true)
    const srv = servizi.find(s => s.nome === selectedSrv)

    await supabase.from('appuntamenti').insert({
      paziente_id: selectedPaz?.id ?? null,
      paziente_nome: pazNome,
      servizio_id: srv?.id ?? null,
      servizio_nome: selectedSrv,
      operatore_id: null,
      operatore_nome: operatoreNome,
      data,
      ora: ora + ':00',
      durata_minuti: srv?.durata_minuti ?? 30,
      stato: 'Prenotato',
      colonna_agenda: colIdx + 2,
      note: note || null,
    })

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h3 className="font-display font-bold text-white">Nuovo Appuntamento</h3>
            <p className="text-xs text-dac-gray-400 mt-0.5">
              {format(new Date(data), 'd MMMM yyyy', { locale: it })} • {ora} • {operatoreNome}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Paziente */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
              Paziente
            </label>
            {selectedPaz ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-dac-teal/10 border border-dac-teal/20">
                <span className="text-sm font-semibold text-white">{selectedPaz.cognome} {selectedPaz.nome}</span>
                <button onClick={() => { setSelectedPaz(null); setPazienteSearch('') }}
                  className="text-dac-gray-400 hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
                <input
                  type="text"
                  value={pazienteSearch}
                  onChange={e => { setPazienteSearch(e.target.value); setManualName(e.target.value) }}
                  placeholder="Cerca per cognome o CF..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                    placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50"
                  autoFocus
                />
                {pazienti.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-dac-deep border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                    {pazienti.map(p => (
                      <button key={p.id} onClick={() => { setSelectedPaz(p); setPazienti([]) }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center justify-between">
                        <span className="text-sm text-white">{p.cognome} {p.nome}</span>
                        <span className="text-[10px] text-dac-gray-500 font-mono">{p.codice}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Servizio */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
              Servizio
            </label>
            <select value={selectedSrv} onChange={e => setSelectedSrv(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                focus:outline-none focus:border-dac-accent/50 [&>option]:bg-dac-deep [&>option]:text-white">
              <option value="">Seleziona servizio...</option>
              {servizi.map(s => (
                <option key={s.id} value={s.nome}>{s.nome} — €{s.prezzo} ({s.durata_minuti} min)</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1.5">
              Note (opzionale)
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50 resize-none"
              placeholder="Note aggiuntive..." />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">
            Annulla
          </button>
          <button onClick={salva}
            disabled={saving || (!selectedPaz && !manualName.trim()) || !selectedSrv}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90
              disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Prenota</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// PANEL: Dettaglio Appuntamento
// ═══════════════════════════════════════════════════════════
function DettaglioAppuntamento({ app, onClose, onCambiaStato, onDeleted }: {
  app: Appuntamento
  onClose: () => void
  onCambiaStato: (id: string, stato: string) => void
  onDeleted: () => void
}) {
  const stato = STATO_COLORS[app.stato] ?? STATO_COLORS['Prenotato']

  async function elimina() {
    if (!confirm('Eliminare questo appuntamento?')) return
    await supabase.from('appuntamenti').delete().eq('id', app.id)
    onDeleted()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 w-80 h-full bg-dac-card border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5" style={{ background: `linear-gradient(135deg, ${stato.text}30, transparent)` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: stato.bg, color: stato.text }}>
              {stato.label} {app.stato}
            </span>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 text-dac-gray-400"><X size={16} /></button>
          </div>
          <h3 className="font-display font-bold text-white">{app.paziente_nome}</h3>
          <p className="text-xs text-dac-gray-300">{app.servizio_nome}</p>
        </div>

        {/* Info */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <InfoRow label="Ora" value={app.ora?.substring(0, 5)} />
          <InfoRow label="Operatore" value={app.operatore_nome} />
          <InfoRow label="Durata" value={`${app.durata_minuti} min`} />
          {app.note && <InfoRow label="Note" value={app.note} />}

          {/* Azioni stato */}
          <div className="pt-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-2">
              Cambia stato
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {['Prenotato', 'Confermato', 'In corso', 'Completato', 'No-show', 'Cancellato'].map(s => {
                const sc = STATO_COLORS[s]
                const isActive = app.stato === s
                return (
                  <button key={s} onClick={() => onCambiaStato(app.id, s)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${isActive ? '' : 'hover:opacity-80'}`}
                    style={{ background: sc.bg, color: sc.text, boxShadow: isActive ? `0 0 0 2px ${sc.text}` : 'none' }}>
                    {sc.label} {s}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button onClick={elimina}
            className="w-full py-2 rounded-xl text-xs font-semibold text-dac-red bg-dac-red/10 hover:bg-dac-red/20 transition-colors">
            🗑️ Elimina Appuntamento
          </button>
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/[0.03]">
      <span className="text-[10px] text-dac-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs text-white font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}
