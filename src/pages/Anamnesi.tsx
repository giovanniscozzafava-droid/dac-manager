import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { ClipboardList, Plus, X, Check, Search, Edit3, Trash2, Send, Eye, Mail } from 'lucide-react'

interface Anamnesi {
  id: string; codice: string; paziente_id: string | null; paziente_nome: string; specialista: string | null
  patologie: string | null; allergie: string | null; farmaci: string | null; interventi_pregressi: string | null
  peso: number | null; altezza: number | null; pressione_arteriosa: string | null; frequenza_cardiaca: number | null; glicemia: number | null
  gravidanza: string | null; pacemaker: string | null; prob_circolatori: string | null; fototipo: string | null
  fumo: string | null; alcol: string | null; attivita_fisica: string | null
  mansione: string | null; rischio_lavorativo: string | null; idoneita: string | null
  motivo_visita: string | null; note_infermiera: string | null
  stato: string; email_inviata: boolean; note_medico: string | null; doc_url: string | null; created_at: string
  email_inviata_a: string | null; email_inviata_at: string | null
}

interface Props { operatore: Operatore }

export function AnamnesiPage({ operatore }: Props) {
  const [items, setItems] = useState<Anamnesi[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSpec, setFilterSpec] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Anamnesi | null>(null)
  const [specialistiDB, setSpecialistiDB] = useState<string[]>([])

  useEffect(() => {
    supabase.from('specialisti').select('specializzazione').eq('attivo', true).order('specializzazione').then(({ data }) => {
      if (data) setSpecialistiDB([...new Set(data.map((s: any) => s.specializzazione))])
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('anamnesi').select('*').order('created_at', { ascending: false })
    setItems(data ?? []); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(a => {
    if (search) {
      const q = search.toLowerCase()
      if (!a.paziente_nome.toLowerCase().includes(q) && !(a.codice?.toLowerCase().includes(q))) return false
    }
    if (filterSpec && a.specialista !== filterSpec) return false
    return true
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-dac-accent" />
            <h1 className="font-display font-bold text-lg text-white">Anamnesi</h1>
            <span className="text-xs text-dac-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{filtered.length}</span>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90 transition-opacity">
            <Plus size={14} /> Nuova Anamnesi
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca paziente..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
          </div>
          <select value={filterSpec} onChange={e => setFilterSpec(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">Tutti gli specialisti</option>
            {specialistiDB.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-white/3 animate-pulse" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-16 text-dac-gray-500 text-sm">Nessuna anamnesi</div>
        : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map(a => (
              <div key={a.id} onClick={() => setSelected(a)}
                className="flex items-center gap-4 px-4 lg:px-6 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(46,134,193,0.1)' }}>📋</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{a.paziente_nome}</div>
                  <div className="text-[10px] text-dac-gray-400">
                    {a.specialista ?? '—'} • {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')} • {a.motivo_visita ? a.motivo_visita.substring(0, 40) : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.email_inviata ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-dac-green/10 text-dac-green">Inviata</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-dac-orange/10 text-dac-orange">Salvata</span>
                  )}
                  {a.doc_url && (
                    <a href={a.doc_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                      className="p-1 rounded hover:bg-white/10 text-dac-gray-400 hover:text-white"><Eye size={13} /></a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <AnamnesiForm operatore={operatore} specialistiLista={specialistiDB} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {selected && <AnamnesiDetail item={selected} onClose={() => setSelected(null)} onDeleted={() => { setSelected(null); load() }} onReload={load} />}
    </div>
  )
}

// FORM
function AnamnesiForm({ operatore, specialistiLista, onClose, onSaved }: { operatore: Operatore; specialistiLista: string[]; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<'paz' | 'vitali' | 'clinica' | 'lavoro'>('paz')
  const [saving, setSaving] = useState(false)
  const [pazSearch, setPazSearch] = useState('')
  const [pazienti, setPazienti] = useState<any[]>([])
  const [selPaz, setSelPaz] = useState<any>(null)
  const [specialista, setSpecialista] = useState('')
  const [motivo, setMotivo] = useState('')
  const [patologie, setPatologie] = useState('')
  const [allergie, setAllergie] = useState('')
  const [farmaci, setFarmaci] = useState('')
  const [interventi, setInterventi] = useState('')
  const [peso, setPeso] = useState('')
  const [altezza, setAltezza] = useState('')
  const [pa, setPa] = useState('')
  const [fc, setFc] = useState('')
  const [glicemia, setGlicemia] = useState('')
  const [gravidanza, setGravidanza] = useState('No')
  const [pacemaker, setPacemaker] = useState('No')
  const [probCirc, setProbCirc] = useState('No')
  const [fototipo, setFototipo] = useState('')
  const [fumo, setFumo] = useState('No')
  const [alcol, setAlcol] = useState('No/Occasionale')
  const [attFisica, setAttFisica] = useState('Sedentario')
  const [noteInf, setNoteInf] = useState('')
  const [mansione, setMansione] = useState('')
  const [rischioLav, setRischioLav] = useState('')
  const [idoneita, setIdoneita] = useState('')

  useEffect(() => {
    if (pazSearch.length < 2) { setPazienti([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('pazienti').select('id, codice, cognome, nome, patologie, allergie, farmaci')
        .or('cognome.ilike.%' + pazSearch + '%,nome.ilike.%' + pazSearch + '%').limit(6)
      setPazienti(data ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [pazSearch])

  function selectPaz(p: any) {
    setSelPaz(p); setPazienti([])
    if (p.patologie) setPatologie(p.patologie)
    if (p.allergie) setAllergie(p.allergie)
    if (p.farmaci) setFarmaci(p.farmaci)
  }

  async function salva() {
    const pazNome = selPaz ? selPaz.cognome + ' ' + selPaz.nome : pazSearch.trim()
    if (!pazNome || !specialista) { alert('Paziente e specialista obbligatori'); return }
    setSaving(true)
    const codice = 'ANA-' + format(new Date(), 'yyMMddHHmmss')
    await supabase.from('anamnesi').insert({
      codice, paziente_id: selPaz?.id ?? null, paziente_nome: pazNome, specialista,
      patologie: patologie || null, allergie: allergie || null, farmaci: farmaci || null,
      interventi_pregressi: interventi || null,
      peso: peso ? Number(peso) : null, altezza: altezza ? Number(altezza) : null,
      pressione_arteriosa: pa || null, frequenza_cardiaca: fc ? Number(fc) : null,
      glicemia: glicemia ? Number(glicemia) : null,
      gravidanza, pacemaker, prob_circolatori: probCirc, fototipo: fototipo || null,
      fumo, alcol, attivita_fisica: attFisica,
      mansione: mansione || null, rischio_lavorativo: rischioLav || null, idoneita: idoneita || null,
      motivo_visita: motivo || null, note_infermiera: noteInf || null,
      stato: 'Compilata', email_inviata: false,
    })
    setSaving(false); onSaved()
  }

  const TABS = [
    { id: 'paz' as const, label: 'Paziente' },
    { id: 'vitali' as const, label: 'Parametri' },
    { id: 'clinica' as const, label: 'Clinica' },
    { id: 'lavoro' as const, label: 'Med. Lavoro' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <h3 className="font-display font-bold text-white">Nuova Anamnesi</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>
        <div className="flex border-b border-white/5 px-5 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ' +
                (tab === t.id ? 'border-dac-accent text-dac-accent' : 'border-transparent text-dac-gray-400 hover:text-white')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tab === 'paz' && <>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Paziente *</label>
              {selPaz ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-dac-teal/10 border border-dac-teal/20">
                  <span className="text-sm font-semibold text-white">{selPaz.cognome} {selPaz.nome}</span>
                  <button onClick={() => setSelPaz(null)} className="text-dac-gray-400 hover:text-white"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={pazSearch} onChange={e => setPazSearch(e.target.value)} className="input-field" placeholder="Cerca paziente..." autoFocus />
                  {pazienti.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-dac-deep border border-white/10 rounded-xl shadow-2xl z-10 max-h-40 overflow-y-auto">
                      {pazienti.map(p => (
                        <button key={p.id} onClick={() => selectPaz(p)} className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm text-white">{p.cognome} {p.nome}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Specialista *</label>
              <select value={specialista} onChange={e => setSpecialista(e.target.value)} className="input-field">
                <option value="">Seleziona...</option>{specialistiLista.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Motivo visita</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} className="input-field resize-none" rows={2} placeholder="" />
            </div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note infermiera</label>
              <textarea value={noteInf} onChange={e => setNoteInf(e.target.value)} className="input-field resize-none" rows={2} />
            </div>
          </>}

          {tab === 'vitali' && <>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Peso (kg)</label><input type="number" value={peso} onChange={e => setPeso(e.target.value)} className="input-field text-center" /></div>
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Altezza (cm)</label><input type="number" value={altezza} onChange={e => setAltezza(e.target.value)} className="input-field text-center" /></div>
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Glicemia</label><input type="number" value={glicemia} onChange={e => setGlicemia(e.target.value)} className="input-field text-center" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">PA (mmHg)</label><input type="text" value={pa} onChange={e => setPa(e.target.value)} className="input-field" placeholder="120/80" /></div>
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">FC (bpm)</label><input type="number" value={fc} onChange={e => setFc(e.target.value)} className="input-field text-center" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Gravidanza</label><select value={gravidanza} onChange={e => setGravidanza(e.target.value)} className="input-field"><option>No</option><option>Si</option><option>Non applicabile</option></select></div>
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Pacemaker</label><select value={pacemaker} onChange={e => setPacemaker(e.target.value)} className="input-field"><option>No</option><option>Si</option></select></div>
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Prob. circolatori</label><select value={probCirc} onChange={e => setProbCirc(e.target.value)} className="input-field"><option>No</option><option>Si</option></select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Fumo</label><select value={fumo} onChange={e => setFumo(e.target.value)} className="input-field"><option>No</option><option>Si</option><option>Ex</option></select></div>
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Alcol</label><select value={alcol} onChange={e => setAlcol(e.target.value)} className="input-field"><option>No/Occasionale</option><option>Moderato</option><option>Frequente</option></select></div>
              <div><label className="block text-[9px] text-dac-gray-400 mb-1">Att. fisica</label><select value={attFisica} onChange={e => setAttFisica(e.target.value)} className="input-field"><option>Sedentario</option><option>Leggera</option><option>Moderata</option><option>Intensa</option></select></div>
            </div>
            <div><label className="block text-[9px] text-dac-gray-400 mb-1">Fototipo</label><select value={fototipo} onChange={e => setFototipo(e.target.value)} className="input-field"><option value="">-</option><option>I</option><option>II</option><option>III</option><option>IV</option><option>V</option><option>VI</option></select></div>
          </>}

          {tab === 'clinica' && <>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Patologie</label>
              <textarea value={patologie} onChange={e => setPatologie(e.target.value)} className="input-field resize-none" rows={2} placeholder="" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Allergie</label>
              <textarea value={allergie} onChange={e => setAllergie(e.target.value)} className="input-field resize-none" rows={2} placeholder="" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Farmaci in uso</label>
              <textarea value={farmaci} onChange={e => setFarmaci(e.target.value)} className="input-field resize-none" rows={2} /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Interventi pregressi</label>
              <textarea value={interventi} onChange={e => setInterventi(e.target.value)} className="input-field resize-none" rows={2} /></div>
          </>}

          {tab === 'lavoro' && <>
            <div className="px-3 py-2 rounded-lg bg-dac-orange/10 border border-dac-orange/20 text-[10px] text-dac-orange mb-2">
              Sezione specifica per Medicina del Lavoro
            </div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Mansione</label>
              <input type="text" value={mansione} onChange={e => setMansione(e.target.value)} className="input-field" placeholder="" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Rischio lavorativo</label>
              <textarea value={rischioLav} onChange={e => setRischioLav(e.target.value)} className="input-field resize-none" rows={2} placeholder="" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Idoneita</label>
              <select value={idoneita} onChange={e => setIdoneita(e.target.value)} className="input-field">
                <option value="">-</option><option>Idoneo</option><option>Idoneo con limitazioni</option><option>Idoneo con prescrizioni</option><option>Non idoneo temporaneo</option><option>Non idoneo permanente</option>
              </select></div>
          </>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">Annulla</button>
          <button onClick={salva} disabled={saving || (!selPaz && !pazSearch.trim()) || !specialista}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Salva Anamnesi</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// DETTAGLIO
function AnamnesiDetail({ item: a, onClose, onDeleted, onReload }: { item: Anamnesi; onClose: () => void; onDeleted: () => void; onReload: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 w-96 h-full bg-dac-card border-l border-white/10 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-white/5" style={{ background: 'rgba(46,134,193,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-dac-gray-400">{a.codice}</span>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 text-dac-gray-400"><X size={16} /></button>
          </div>
          <h3 className="font-display font-bold text-white text-lg">{a.paziente_nome}</h3>
          <div className="text-xs text-dac-gray-400 mt-0.5">{a.specialista} • {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {a.motivo_visita && <Sec title="Motivo visita"><p className="text-xs text-dac-gray-300">{a.motivo_visita}</p></Sec>}

          {(a.peso || a.altezza || a.pressione_arteriosa) && (
            <Sec title="Parametri vitali">
              <div className="grid grid-cols-3 gap-2">
                {a.peso && <Mini label="Peso" value={a.peso + ' kg'} />}
                {a.altezza && <Mini label="Altezza" value={a.altezza + ' cm'} />}
                {a.frequenza_cardiaca && <Mini label="FC" value={a.frequenza_cardiaca + ' bpm'} />}
                {a.pressione_arteriosa && <Mini label="PA" value={a.pressione_arteriosa} />}
                {a.glicemia && <Mini label="Glicemia" value={String(a.glicemia)} />}
              </div>
            </Sec>
          )}

          {(a.patologie || a.allergie || a.farmaci) && (
            <Sec title="Anamnesi clinica">
              {a.patologie && <DR label="Patologie" value={a.patologie} />}
              {a.allergie && <DR label="Allergie" value={a.allergie} />}
              {a.farmaci && <DR label="Farmaci" value={a.farmaci} />}
              {a.interventi_pregressi && <DR label="Interventi" value={a.interventi_pregressi} />}
            </Sec>
          )}

          <Sec title="Checklist">
            <DR label="Gravidanza" value={a.gravidanza ?? 'No'} />
            <DR label="Pacemaker" value={a.pacemaker ?? 'No'} />
            <DR label="Prob. circolatori" value={a.prob_circolatori ?? 'No'} />
            <DR label="Fumo" value={a.fumo ?? '-'} />
            <DR label="Alcol" value={a.alcol ?? '-'} />
            <DR label="Att. fisica" value={a.attivita_fisica ?? '-'} />
            {a.fototipo && <DR label="Fototipo" value={a.fototipo} />}
          </Sec>

          {(a.mansione || a.idoneita) && (
            <Sec title="Medicina del Lavoro">
              {a.mansione && <DR label="Mansione" value={a.mansione} />}
              {a.rischio_lavorativo && <DR label="Rischio" value={a.rischio_lavorativo} />}
              {a.idoneita && <DR label="Idoneita" value={a.idoneita} />}
            </Sec>
          )}

          {a.note_infermiera && <Sec title="Note infermiera"><p className="text-xs text-dac-gray-300">{a.note_infermiera}</p></Sec>}
          {a.note_medico && <Sec title="Note medico"><p className="text-xs text-dac-gray-300">{a.note_medico}</p></Sec>}

          {a.doc_url && (
            <a href={a.doc_url} target="_blank" rel="noreferrer"
              className="block px-3 py-2 rounded-lg bg-dac-accent/10 text-dac-accent text-xs font-semibold hover:bg-dac-accent/20 transition-colors text-center">
              Apri documento
            </a>
          )}
        </div>

        <div className="p-4 border-t border-white/5 space-y-2">
          <InviaEmailButton anamnesi={a} onReload={onReload} />
          <button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('anamnesi').delete().eq('id', a.id); onDeleted() } }}
            className="w-full py-2 rounded-xl text-xs font-semibold text-dac-red bg-dac-red/10 hover:bg-dac-red/20 transition-colors">Elimina</button>
        </div>
      </div>
    </>
  )
}

// INVIA EMAIL
function InviaEmailButton({ anamnesi, onReload }: { anamnesi: Anamnesi; onReload: () => void }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(anamnesi.email_inviata)
  const [email, setEmail] = useState('')
  const [loadingSpec, setLoadingSpec] = useState(true)
  const [specOptions, setSpecOptions] = useState<{ nome: string; email: string }[]>([])

  useEffect(() => {
    supabase.from('specialisti').select('nome, specializzazione, email_referti').eq('attivo', true).then(({ data }) => {
      if (data) {
        const opts = data.filter((s: any) => s.email_referti).map((s: any) => ({ nome: s.specializzazione + ' - ' + s.nome, email: s.email_referti }))
        setSpecOptions(opts)
        const match = data.find((s: any) => s.specializzazione === anamnesi.specialista || s.nome === anamnesi.specialista)
        if (match?.email_referti) setEmail(match.email_referti)
      }
      setLoadingSpec(false)
    })
  }, [anamnesi.specialista])

  async function invia() {
    if (!email.trim()) { alert('Email destinatario obbligatoria'); return }
    setSending(true)
    try {
      const { generaAnamnesiDOCX } = await import('@/lib/anamnesiDOCX')
      let paziente = null
      if (anamnesi.paziente_id) {
        const { data } = await supabase.from('pazienti').select('*').eq('id', anamnesi.paziente_id).maybeSingle()
        paziente = data
      }
      const { blob, base64, filename } = await generaAnamnesiDOCX(anamnesi as any, paziente as any)
      const path = 'anamnesi_' + anamnesi.codice + '_' + Date.now() + '.docx'
      const { error: upErr } = await supabase.storage.from('anamnesi-docs').upload(path, blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true })
      if (upErr) throw new Error('Upload fallito: ' + upErr.message)
      const { data: urlData } = supabase.storage.from('anamnesi-docs').getPublicUrl(path)

      const subject = 'Anamnesi paziente ' + anamnesi.paziente_nome + ' - ' + format(new Date(anamnesi.created_at), 'dd/MM/yyyy')
      const htmlBody = '<p>Gentile <strong>' + anamnesi.specialista + '</strong>,</p><p>in allegato la scheda anamnestica del paziente <strong>' + anamnesi.paziente_nome + '</strong>.</p><p><strong>Codice:</strong> ' + anamnesi.codice + '<br/><strong>Data:</strong> ' + format(new Date(anamnesi.created_at), 'dd/MM/yyyy HH:mm') + '</p>' + (anamnesi.motivo_visita ? '<p><strong>Motivo:</strong> ' + anamnesi.motivo_visita + '</p>' : '') + '<p>Il documento allegato (.docx) è editabile: può compilare le sezioni riservate al medico (esame obiettivo, diagnosi, terapia, esami, controllo), stamparlo e consegnarlo al paziente.</p><hr/><p style="font-size:11px;color:#666">Palazzo della Salute - LABORATORI DAC S.R.L. - Catenanuova (EN)<br/>Documento riservato ex art. 9 GDPR.</p>'

      const { error: fnErr } = await supabase.functions.invoke('send-anamnesi-email', {
        body: { to: email.trim(), toName: anamnesi.specialista, subject, htmlBody, pdfBase64: base64, pdfName: filename, anamnesiId: anamnesi.id }
      })
      if (fnErr) throw new Error('Email fallita: ' + fnErr.message)
      await supabase.from('anamnesi').update({ doc_url: urlData.publicUrl }).eq('id', anamnesi.id)
      setSent(true)
      onReload()
      alert('Email inviata a ' + email)
    } catch (e: any) {
      console.error('Errore invio:', e)
      alert('Errore: ' + (e.message || 'invio fallito'))
    } finally {
      setSending(false)
    }
  }

  if (sent) return <div className="w-full py-2 rounded-xl text-xs font-semibold text-center bg-dac-green/10 text-dac-green">Email inviata{anamnesi.email_inviata_a ? ' a ' + anamnesi.email_inviata_a : ''}</div>
  if (loadingSpec) return <div className="w-full py-2 rounded-xl text-xs text-center text-dac-gray-400">Caricamento...</div>

  return (
    <div className="space-y-2">
      {specOptions.length > 0 ? (
        <select value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-dac-accent/50 [&>option]:bg-dac-deep">
          <option value="">Seleziona destinatario...</option>
          {specOptions.map(s => <option key={s.email} value={s.email}>{s.nome} - {s.email}</option>)}
        </select>
      ) : (
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@specialista.it"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
      )}
      <button onClick={invia} disabled={sending || !email.trim()}
        className="w-full py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
        {sending ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Mail size={13} /> Invia a {email ? email.substring(0, 25) : 'specialista'}</>}
      </button>
    </div>
  )
}

// HELPERS
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h4 className="text-[10px] font-semibold uppercase tracking-wider text-dac-gray-500 mb-2">{title}</h4>{children}</div>
}
function DR({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between items-start py-1 border-b border-white/[0.03]"><span className="text-[10px] text-dac-gray-500">{label}</span><span className="text-xs text-white text-right max-w-[65%]">{value}</span></div>
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="text-center p-2 rounded-lg bg-white/3"><div className="text-sm font-bold text-white">{value}</div><div className="text-[8px] text-dac-gray-500 uppercase">{label}</div></div>
}
