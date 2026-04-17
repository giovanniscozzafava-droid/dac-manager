import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Users, Search, Plus, X, ChevronDown, Edit3, Phone, Mail,
  MapPin, Shield, AlertTriangle, FileText, ClipboardList,
  Check, Trash2, Filter, Download, Hash
} from 'lucide-react'
import { GDPRDocument } from '@/components/GDPRDocument'

interface Paziente {
  id: string
  codice: string
  cognome: string
  nome: string
  sesso: string | null
  data_nascita: string | null
  codice_fiscale: string | null
  luogo_nascita: string | null
  telefono: string | null
  email: string | null
  via: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  tipo: string | null
  reparto: string | null
  provenienza: string | null
  data_prima_visita: string | null
  gdpr: string
  doc_gdpr_url: string | null
  patologie: string | null
  allergie: string | null
  farmaci: string | null
  fototipo: string | null
  gravidanza: string | null
  pacemaker: string | null
  prob_circolatori: string | null
  note_mediche: string | null
  ultimo_servizio: string | null
  prossimo_recall: string | null
  noshow_count: number
  note: string | null
  rischio: string | null
  data_recall_medico: string | null
  created_at: string
}

interface Props {
  operatore: Operatore
}

const REPARTI = ['Laboratorio', 'Estetica', 'Med. Estetica', 'Med. Lavoro', 'Specialisti', 'Parafarmacia']
const PROVINCE_SICILIA = ['AG','CL','CT','EN','ME','PA','RG','SR','TP']
const PROVINCE_CALABRIA = ['CS','CZ','KR','RC','VV']

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function Pazienti({ operatore }: Props) {
  const [pazienti, setPazienti] = useState<Paziente[]>([])
  const [filtered, setFiltered] = useState<Paziente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterReparto, setFilterReparto] = useState('')
  const [filterGdpr, setFilterGdpr] = useState('')
  const [selected, setSelected] = useState<Paziente | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // ── Load ──
  const loadPazienti = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pazienti')
      .select('*')
      .eq('archiviato', false)
      .order('cognome')
    setPazienti(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadPazienti() }, [loadPazienti])
  useAutoRefresh(loadPazienti)

  // ── Filtri ──
  useEffect(() => {
    let result = pazienti
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.cognome.toLowerCase().includes(q) ||
        p.nome.toLowerCase().includes(q) ||
        (p.codice_fiscale?.toLowerCase().includes(q)) ||
        (p.telefono?.includes(q)) ||
        (p.codice?.toLowerCase().includes(q))
      )
    }
    if (filterReparto) result = result.filter(p => p.reparto === filterReparto)
    if (filterGdpr === 'firmato') result = result.filter(p => p.gdpr === 'firmato')
    if (filterGdpr === 'mancante') result = result.filter(p => p.gdpr !== 'firmato')
    setFiltered(result)
  }, [pazienti, search, filterReparto, filterGdpr])

  function onSaved() {
    setShowNew(false)
    setShowEdit(false)
    setSelected(null)
    loadPazienti()
  }

  async function reloadSelected() {
    await loadPazienti()
    if (selected) {
      const { data } = await supabase.from('pazienti').select('*').eq('id', selected.id).single()
      if (data) setSelected(data)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── HEADER ── */}
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-dac-accent" />
            <h1 className="font-display font-bold text-lg text-white">Pazienti</h1>
            <span className="text-xs text-dac-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
              {filtered.length}/{pazienti.length}
            </span>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90 transition-opacity">
            <Plus size={14} /> Nuovo Paziente
          </button>
        </div>

        {/* Filtri */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca cognome, nome, CF, telefono..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
          </div>
          <select value={filterReparto} onChange={e => setFilterReparto(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">Tutti i reparti</option>
            {REPARTI.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterGdpr} onChange={e => setFilterGdpr(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">GDPR: Tutti</option>
            <option value="firmato">✅ Firmato</option>
            <option value="mancante">❌ Mancante</option>
          </select>
        </div>
      </div>

      {/* ── TABELLA ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/3 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dac-gray-500">
            <Users size={40} className="opacity-20 mb-3" />
            <p className="text-sm">{search ? 'Nessun paziente trovato' : 'Nessun paziente registrato'}</p>
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-dac-deep border-b border-white/10">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">Paziente</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">CF</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">Contatti</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">Reparto</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">GDPR</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">No-show</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">Ultimo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => setSelected(p)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: p.sesso === 'F' ? 'rgba(142,68,173,0.15)' : 'rgba(52,152,219,0.15)',
                                 color: p.sesso === 'F' ? '#8e44ad' : '#3498db' }}>
                        {p.sesso === 'F' ? '♀' : '♂'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white group-hover:text-dac-accent transition-colors">
                          {p.cognome} {p.nome}
                        </div>
                        <div className="text-[10px] text-dac-gray-500 font-mono">{p.codice}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-mono text-dac-gray-400">{p.codice_fiscale || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs text-dac-gray-300">{p.telefono || '—'}</div>
                    {p.email && <div className="text-[10px] text-dac-gray-500 truncate max-w-[150px]">{p.email}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    {p.reparto ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dac-accent/10 text-dac-accent">
                        {p.reparto}
                      </span>
                    ) : <span className="text-dac-gray-500 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {p.gdpr === 'firmato'
                      ? <span className="text-dac-green text-sm">✅</span>
                      : <span className="text-dac-red text-sm">❌</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {p.noshow_count > 0
                      ? <span className={`text-xs font-bold ${p.noshow_count >= 3 ? 'text-dac-red' : 'text-dac-orange'}`}>{p.noshow_count}</span>
                      : <span className="text-dac-gray-500 text-xs">0</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-dac-gray-400">{p.ultimo_servizio || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── PANEL DETTAGLIO ── */}
      {selected && (
        <DettaglioPaziente
          paziente={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setShowEdit(true) }}
          onDeleted={onSaved}
          onReload={reloadSelected}
        />
      )}

      {/* ── MODAL NUOVO / EDIT ── */}
      {(showNew || showEdit) && (
        <PazienteForm
          paziente={showEdit && selected ? selected : null}
          onClose={() => { setShowNew(false); setShowEdit(false) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// PANEL: Dettaglio Paziente
// ═══════════════════════════════════════════════════════════
function DettaglioPaziente({ paziente: p, onClose, onEdit, onDeleted, onReload }: {
  paziente: Paziente; onClose: () => void; onEdit: () => void; onDeleted: () => void; onReload: () => Promise<void>
}) {
  const [showGDPR, setShowGDPR] = useState(false)
  const gdprFirmato = p.gdpr === 'firmato'

  async function elimina() {
    if (!confirm(`Eliminare ${p.cognome} ${p.nome}? L'operazione è irreversibile.`)) return
    await supabase.from('pazienti').update({ archiviato: true }).eq('id', p.id)
    onDeleted()
  }

  const dataNascita = p.data_nascita ? format(new Date(p.data_nascita), 'dd/MM/yyyy') : '—'
  const primaVisita = p.data_prima_visita ? format(new Date(p.data_prima_visita), 'dd/MM/yyyy') : '—'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 w-96 h-full bg-dac-card border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${p.sesso === 'F' ? '#8e44ad20' : '#3498db20'}, transparent)` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-dac-gray-400">{p.codice}</span>
            <div className="flex gap-1">
              <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400 hover:text-white"><Edit3 size={14} /></button>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400"><X size={16} /></button>
            </div>
          </div>
          <h2 className="font-display font-bold text-xl text-white">{p.cognome} {p.nome}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-dac-gray-400">
            <span>{p.sesso === 'F' ? '♀ Donna' : '♂ Uomo'}</span>
            <span>•</span>
            <span>Nato/a {dataNascita}</span>
            {p.luogo_nascita && <><span>•</span><span>{p.luogo_nascita}</span></>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contatti */}
          <Section title="Contatti">
            {p.telefono && <InfoIcon icon={Phone} value={p.telefono} />}
            {p.email && <InfoIcon icon={Mail} value={p.email} />}
            {(p.via || p.citta) && (
              <InfoIcon icon={MapPin} value={[p.via, p.cap, p.citta, p.provincia ? `(${p.provincia})` : ''].filter(Boolean).join(', ')} />
            )}
          </Section>

          {/* Classificazione */}
          <Section title="Classificazione">
            <InfoRow label="CF" value={p.codice_fiscale || '—'} mono />
            <InfoRow label="Reparto" value={p.reparto || '—'} />
            <InfoRow label="Tipo" value={p.tipo || '—'} />
            <InfoRow label="Provenienza" value={p.provenienza || '—'} />
            <InfoRow label="Prima visita" value={primaVisita} />
            <InfoRow label="GDPR" value={gdprFirmato ? '✅ Firmato' : '❌ Mancante'} />
          </Section>

          {/* Anamnesi */}
          {(p.patologie || p.allergie || p.farmaci) && (
            <Section title="Anamnesi">
              {p.patologie && <InfoRow label="Patologie" value={p.patologie} />}
              {p.allergie && <InfoRow label="Allergie" value={p.allergie} />}
              {p.farmaci && <InfoRow label="Farmaci" value={p.farmaci} />}
              <InfoRow label="Gravidanza" value={p.gravidanza || 'No'} />
              <InfoRow label="Pacemaker" value={p.pacemaker || 'No'} />
              <InfoRow label="Prob. circolatori" value={p.prob_circolatori || 'No'} />
              {p.note_mediche && <InfoRow label="Note mediche" value={p.note_mediche} />}
            </Section>
          )}

          {/* Storico */}
          <Section title="Storico">
            <InfoRow label="Ultimo servizio" value={p.ultimo_servizio || '—'} />
            <InfoRow label="No-show" value={String(p.noshow_count)} highlight={p.noshow_count >= 3} />
            {p.rischio && <InfoRow label="Rischio" value={p.rischio} highlight={p.rischio === 'Alto' || p.rischio === 'Critico'} />}
          </Section>

          {/* Note */}
          {p.note && (
            <Section title="Note">
              <p className="text-xs text-dac-gray-300 whitespace-pre-wrap leading-relaxed">{p.note}</p>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex-shrink-0 space-y-2">
          {gdprFirmato ? (
            p.doc_gdpr_url ? (
              <a href={p.doc_gdpr_url} target="_blank" rel="noopener noreferrer"
                className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-dac-green/80 hover:bg-dac-green transition-colors flex items-center justify-center gap-2">
                <Download size={14} /> Scarica GDPR firmato
              </a>
            ) : (
              <div className="w-full py-2 rounded-xl text-xs font-semibold text-dac-gray-400 bg-white/5 text-center">
                ✅ GDPR firmato (PDF non disponibile)
              </div>
            )
          ) : (
            <button onClick={() => setShowGDPR(true)}
              className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-dac-accent/80 hover:bg-dac-accent transition-colors flex items-center justify-center gap-2">
              <FileText size={14} /> Firma GDPR
            </button>
          )}
          <button onClick={elimina}
            className="w-full py-2 rounded-xl text-xs font-semibold text-dac-red bg-dac-red/10 hover:bg-dac-red/20 transition-colors">
            🗑️ Archivia Paziente
          </button>
        </div>
      </div>
      {showGDPR && (
        <GDPRDocument
          paziente={{ id: p.id, nome: p.nome, cognome: p.cognome, codice_fiscale: p.codice_fiscale, data_nascita: p.data_nascita }}
          onClose={() => setShowGDPR(false)}
          onSigned={async () => { setShowGDPR(false); await onReload() }}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// FORM: Nuovo / Modifica Paziente
// ═══════════════════════════════════════════════════════════
function PazienteForm({ paziente, onClose, onSaved }: {
  paziente: Paziente | null; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!paziente
  const [tab, setTab] = useState<'ana' | 'contatti' | 'clinica'>('ana')
  const [saving, setSaving] = useState(false)
  const [cfDecoded, setCfDecoded] = useState<any>(null)
  const [cfError, setCfError] = useState('')

  // Form fields
  const [cognome, setCognome] = useState(paziente?.cognome ?? '')
  const [nome, setNome] = useState(paziente?.nome ?? '')
  const [sesso, setSesso] = useState(paziente?.sesso ?? '')
  const [dataNascita, setDataNascita] = useState(paziente?.data_nascita ?? '')
  const [cf, setCf] = useState(paziente?.codice_fiscale ?? '')
  const [luogoNascita, setLuogoNascita] = useState(paziente?.luogo_nascita ?? '')
  const [telefono, setTelefono] = useState(paziente?.telefono ?? '')
  const [email, setEmail] = useState(paziente?.email ?? '')
  const [via, setVia] = useState(paziente?.via ?? '')
  const [cap, setCap] = useState(paziente?.cap ?? '')
  const [citta, setCitta] = useState(paziente?.citta ?? '')
  const [provincia, setProvincia] = useState(paziente?.provincia ?? '')
  const [tipo, setTipo] = useState(paziente?.tipo ?? '')
  const [reparto, setReparto] = useState(paziente?.reparto ?? '')
  const [provenienza, setProvenienza] = useState(paziente?.provenienza ?? '')
  const [patologie, setPatologie] = useState(paziente?.patologie ?? '')
  const [allergie, setAllergie] = useState(paziente?.allergie ?? '')
  const [farmaci, setFarmaci] = useState(paziente?.farmaci ?? '')
  const [note, setNote] = useState(paziente?.note ?? '')

  // ── CF Decode ──
  function decodificaCF(codiceFiscale: string) {
    const cfUp = codiceFiscale.toUpperCase().replace(/\s/g, '')
    setCf(cfUp)
    setCfDecoded(null)
    setCfError('')

    if (cfUp.length !== 16) return

    // Validazione base
    if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cfUp)) {
      setCfError('Formato CF non valido')
      return
    }

    // Estrai dati
    const annoStr = parseInt(cfUp.substring(6, 8))
    const letteraMese = cfUp.charAt(8)
    let giorno = parseInt(cfUp.substring(9, 11))

    const mesiMap: Record<string, number> = { A:1, B:2, C:3, D:4, E:5, H:6, L:7, M:8, P:9, R:10, S:11, T:12 }
    const mese = mesiMap[letteraMese]
    if (!mese) { setCfError('Lettera mese non valida'); return }

    const sessoCalc = giorno > 40 ? 'F' : 'M'
    if (giorno > 40) giorno -= 40

    const annoCorrente = new Date().getFullYear() % 100
    const anno = annoStr > annoCorrente ? 1900 + annoStr : 2000 + annoStr

    const dataN = `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`

    // Codice catastale
    const codCat = cfUp.substring(11, 15)

    // Lookup comune
    supabase.from('codici_catastali').select('comune').eq('codice', codCat).maybeSingle().then(({ data }) => {
      const decoded = {
        sesso: sessoCalc,
        dataNascita: dataN,
        giorno, mese, anno,
        codiceCatastale: codCat,
        luogo: data?.comune ?? null,
      }
      setCfDecoded(decoded)

      // Auto-fill
      if (!sesso) setSesso(sessoCalc)
      if (!dataNascita) setDataNascita(dataN)
      if (data?.comune && !luogoNascita) setLuogoNascita(data.comune)
    })
  }

  // ── Check duplicato CF ──
  async function checkDuplicato(): Promise<boolean> {
    if (!cf || cf.length !== 16 || isEdit) return false
    const { data } = await supabase.from('pazienti').select('codice, cognome, nome').eq('codice_fiscale', cf).limit(1)
    if (data && data.length > 0) {
      alert(`⚠️ CF già registrato: ${data[0].cognome} ${data[0].nome} (${data[0].codice})`)
      return true
    }
    return false
  }

  async function salva() {
    if (!cognome.trim() || !nome.trim()) { alert('Cognome e Nome obbligatori'); return }
    if (await checkDuplicato()) return

    setSaving(true)

    const payload = {
      cognome: cognome.trim().toUpperCase(),
      nome: nome.trim().toUpperCase(),
      sesso: sesso || null,
      data_nascita: dataNascita || null,
      codice_fiscale: cf || null,
      luogo_nascita: luogoNascita || null,
      telefono: telefono || null,
      email: email || null,
      via: via || null,
      cap: cap || null,
      citta: citta || null,
      provincia: provincia || null,
      tipo: tipo || null,
      reparto: reparto || null,
      provenienza: provenienza || null,
      patologie: patologie || null,
      allergie: allergie || null,
      farmaci: farmaci || null,
      note: note || null,
    }

    if (isEdit) {
      await supabase.from('pazienti').update(payload).eq('id', paziente!.id)
    } else {
      const codice = 'PAZ-' + format(new Date(), 'yyMMddHHmmss')
      const { error: insErr } = await supabase.from('pazienti').insert({
        ...payload,
        codice,
        gdpr: 'mancante',
        noshow_count: 0,
        data_prima_visita: format(new Date(), 'yyyy-MM-dd'),
      })
      if (insErr) { alert('Errore salvataggio paziente: ' + insErr.message); setSaving(false); return }
    }

    setSaving(false)
    onSaved()
  }

  const TABS = [
    { id: 'ana' as const, label: 'Anagrafica', icon: '📋' },
    { id: 'contatti' as const, label: 'Contatti', icon: '📍' },
    { id: 'clinica' as const, label: 'Clinica', icon: '🏥' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <h3 className="font-display font-bold text-white">
            {isEdit ? `✏️ ${paziente!.cognome} ${paziente!.nome}` : '➕ Nuovo Paziente'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-5 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors
                ${tab === t.id ? 'border-dac-accent text-dac-accent' : 'border-transparent text-dac-gray-400 hover:text-white'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tab === 'ana' && (
            <>
              {/* CF con decode */}
              <FormField label="Codice Fiscale">
                <input type="text" value={cf} onChange={e => decodificaCF(e.target.value)}
                  maxLength={16} placeholder="SCZGGN81S04C352G"
                  className="input-field font-mono uppercase" />
                {cfDecoded && (
                  <div className="mt-1.5 px-3 py-2 rounded-lg bg-dac-green/10 border border-dac-green/20 text-[10px] space-y-0.5">
                    <div className="text-dac-green font-semibold">✅ CF decodificato</div>
                    <div className="text-dac-gray-300">{cfDecoded.sesso === 'M' ? '♂ Maschio' : '♀ Femmina'} • {cfDecoded.giorno}/{cfDecoded.mese}/{cfDecoded.anno}</div>
                    {cfDecoded.luogo
                      ? <div className="text-dac-gray-300">📍 {cfDecoded.luogo}</div>
                      : <div className="text-dac-orange">⚠️ Cod. {cfDecoded.codiceCatastale} — non trovato</div>
                    }
                  </div>
                )}
                {cfError && <div className="mt-1 text-[10px] text-dac-red">❌ {cfError}</div>}
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cognome *">
                  <input type="text" value={cognome} onChange={e => setCognome(e.target.value)}
                    className="input-field uppercase" placeholder="ROSSI" />
                </FormField>
                <FormField label="Nome *">
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    className="input-field uppercase" placeholder="MARIO" />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Sesso">
                  <select value={sesso} onChange={e => setSesso(e.target.value)} className="input-field">
                    <option value="">—</option>
                    <option value="M">♂ M</option>
                    <option value="F">♀ F</option>
                  </select>
                </FormField>
                <FormField label="Data nascita">
                  <input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} className="input-field" />
                </FormField>
                <FormField label="Luogo nascita">
                  <input type="text" value={luogoNascita} onChange={e => setLuogoNascita(e.target.value)}
                    className="input-field" placeholder="Catania (CT)" />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Reparto">
                  <select value={reparto} onChange={e => setReparto(e.target.value)} className="input-field">
                    <option value="">Seleziona...</option>
                    {REPARTI.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Provenienza">
                  <input type="text" value={provenienza} onChange={e => setProvenienza(e.target.value)}
                    className="input-field" placeholder="Social, Passaparola..." />
                </FormField>
              </div>
            </>
          )}

          {tab === 'contatti' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Telefono">
                  <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                    className="input-field" placeholder="3401234567" />
                </FormField>
                <FormField label="Email">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input-field" placeholder="email@esempio.it" />
                </FormField>
              </div>
              <FormField label="Via">
                <input type="text" value={via} onChange={e => setVia(e.target.value)}
                  className="input-field" placeholder="Via Roma 1" />
              </FormField>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="CAP">
                  <input type="text" value={cap} onChange={e => setCap(e.target.value)}
                    className="input-field" placeholder="94010" maxLength={5} />
                </FormField>
                <FormField label="Città">
                  <input type="text" value={citta} onChange={e => setCitta(e.target.value)}
                    className="input-field" placeholder="Catenanuova" />
                </FormField>
                <FormField label="Provincia">
                  <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)}
                    className="input-field uppercase" placeholder="EN" maxLength={2} />
                </FormField>
              </div>
            </>
          )}

          {tab === 'clinica' && (
            <>
              <FormField label="Patologie">
                <textarea value={patologie} onChange={e => setPatologie(e.target.value)}
                  className="input-field resize-none" rows={2} placeholder="Diabete, Ipertensione..." />
              </FormField>
              <FormField label="Allergie">
                <textarea value={allergie} onChange={e => setAllergie(e.target.value)}
                  className="input-field resize-none" rows={2} placeholder="Farmaci, Lattice, Nichel..." />
              </FormField>
              <FormField label="Farmaci in uso">
                <textarea value={farmaci} onChange={e => setFarmaci(e.target.value)}
                  className="input-field resize-none" rows={2} placeholder="Anticoagulanti, Insulina..." />
              </FormField>
              <FormField label="Note generali">
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  className="input-field resize-none" rows={3} placeholder="Note aggiuntive..." />
              </FormField>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">
            Annulla
          </button>
          <button onClick={salva}
            disabled={saving || !cognome.trim() || !nome.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90
              disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check size={14} /> {isEdit ? 'Salva' : 'Registra'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-dac-gray-500 mb-2">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-white/[0.03]">
      <span className="text-[10px] text-dac-gray-500">{label}</span>
      <span className={`text-xs text-right max-w-[65%] ${mono ? 'font-mono text-dac-gray-400' : highlight ? 'text-dac-red font-bold' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

function InfoIcon({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <Icon size={12} className="text-dac-gray-500 mt-0.5 flex-shrink-0" />
      <span className="text-xs text-dac-gray-300">{value}</span>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
