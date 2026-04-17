import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { Heart, Plus, X, Check, AlertTriangle, Minus, Trash2, History, Search } from 'lucide-react'

interface Props { operatore: Operatore }

interface Articolo {
  id: string
  nome: string
  categoria: string
  quantita: number
  unita_misura: string
  scorta_minima: number
  scadenza: string | null
  lotto: string | null
  fornitore_id: string | null
  note: string | null
  attivo: boolean
  created_at: string
}

interface Fornitore { id: string; nome: string }

const CATEGORIE = ['Tutte', 'Medicazione', 'Farmaci', 'Strumenti', 'DPI', 'Emergenza', 'Consumabili']
const UNITA = ['pz', 'cf', 'ml', 'g', 'kg', 'l', 'm', 'paia']

export function PresidioPage({ operatore }: Props) {
  const [items, setItems] = useState<Articolo[]>([])
  const [fornitori, setFornitori] = useState<Fornitore[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Tutte')
  const [filterAlert, setFilterAlert] = useState<'tutti' | 'sotto_scorta' | 'in_scadenza'>('tutti')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Articolo | null>(null)
  const [scaricoItem, setScaricoItem] = useState<Articolo | null>(null)
  const [historyItem, setHistoryItem] = useState<Articolo | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: inv }, { data: forn }] = await Promise.all([
      supabase.from('inventario_presidio').select('*').eq('attivo', true).order('nome'),
      supabase.from('fornitori').select('id, nome').eq('attivo', true).order('nome')
    ])
    setItems(inv ?? [])
    setFornitori(forn ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load)

  const filtered = items.filter(a => {
    if (filterCat !== 'Tutte' && a.categoria !== filterCat) return false
    if (filterAlert === 'sotto_scorta' && a.quantita > a.scorta_minima) return false
    if (filterAlert === 'in_scadenza') {
      if (!a.scadenza) return false
      const gg = differenceInDays(new Date(a.scadenza), new Date())
      if (gg > 30) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!a.nome.toLowerCase().includes(q) && !a.lotto?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const alertsCount = {
    sotto_scorta: items.filter(a => a.quantita <= a.scorta_minima).length,
    in_scadenza: items.filter(a => {
      if (!a.scadenza) return false
      const gg = differenceInDays(new Date(a.scadenza), new Date())
      return gg >= 0 && gg <= 30
    }).length,
    scaduti: items.filter(a => {
      if (!a.scadenza) return false
      return differenceInDays(new Date(a.scadenza), new Date()) < 0
    }).length,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-dac-red" />
            <h1 className="font-display font-bold text-lg text-white">Presidio Infermeria</h1>
            <span className="text-xs text-dac-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{filtered.length}/{items.length}</span>
          </div>
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-red text-white hover:opacity-90">
            <Plus size={14} /> Nuovo Articolo
          </button>
        </div>

        {/* Alert badges */}
        {(alertsCount.sotto_scorta + alertsCount.in_scadenza + alertsCount.scaduti) > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {alertsCount.scaduti > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dac-red/15 text-dac-red">
                <AlertTriangle size={12} /> {alertsCount.scaduti} scaduti
              </div>
            )}
            {alertsCount.sotto_scorta > 0 && (
              <button onClick={() => setFilterAlert('sotto_scorta')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dac-orange/15 text-dac-orange hover:bg-dac-orange/25">
                <AlertTriangle size={12} /> {alertsCount.sotto_scorta} sotto scorta
              </button>
            )}
            {alertsCount.in_scadenza > 0 && (
              <button onClick={() => setFilterAlert('in_scadenza')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-dac-orange/15 text-dac-orange hover:bg-dac-orange/25">
                <AlertTriangle size={12} /> {alertsCount.in_scadenza} in scadenza 30gg
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca articolo, lotto..." className="input-field pl-9 w-full" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input-field">
            {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {filterAlert !== 'tutti' && (
            <button onClick={() => setFilterAlert('tutti')}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">
              ✕ Rimuovi filtro
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/3 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-dac-gray-500 text-sm">Nessun articolo trovato</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(a => (
              <ArticoloCard key={a.id} articolo={a} fornitore={fornitori.find(f => f.id === a.fornitore_id)}
                onScarico={() => setScaricoItem(a)}
                onEdit={() => { setEditItem(a); setShowForm(true) }}
                onHistory={() => setHistoryItem(a)} />
            ))}
          </div>
        )}
      </div>

      {showForm && <ArticoloForm articolo={editItem} fornitori={fornitori}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        onSaved={() => { setShowForm(false); setEditItem(null); load() }} />}

      {scaricoItem && <ScaricoModal articolo={scaricoItem} operatore={operatore}
        onClose={() => setScaricoItem(null)}
        onSaved={() => { setScaricoItem(null); load() }} />}

      {historyItem && <HistoryModal articolo={historyItem}
        onClose={() => setHistoryItem(null)} />}
    </div>
  )
}

function ArticoloCard({ articolo, fornitore, onScarico, onEdit, onHistory }:
  { articolo: Articolo; fornitore?: Fornitore; onScarico: () => void; onEdit: () => void; onHistory: () => void }) {

  const sottoScorta = articolo.quantita <= articolo.scorta_minima
  const scadenzaGiorni = articolo.scadenza ? differenceInDays(new Date(articolo.scadenza), new Date()) : null
  const scaduto = scadenzaGiorni !== null && scadenzaGiorni < 0
  const inScadenza = scadenzaGiorni !== null && scadenzaGiorni >= 0 && scadenzaGiorni <= 30

  const borderClass = scaduto ? 'border-dac-red/40' : sottoScorta || inScadenza ? 'border-dac-orange/40' : 'border-white/5'

  return (
    <div className={`rounded-xl border bg-dac-card/50 p-3 hover:border-white/10 transition-colors ${borderClass}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white truncate">{articolo.nome}</span>
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-white/5 text-dac-gray-400">{articolo.categoria}</span>
          </div>
          {articolo.lotto && <div className="text-[10px] text-dac-gray-500">Lotto: {articolo.lotto}</div>}
        </div>
        <button onClick={onEdit} className="p-1 rounded hover:bg-white/5 text-dac-gray-400 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className={`rounded-lg p-2 text-center ${sottoScorta ? 'bg-dac-orange/10' : 'bg-white/3'}`}>
          <div className="text-[9px] text-dac-gray-400 uppercase">Quantità</div>
          <div className={`text-lg font-bold ${sottoScorta ? 'text-dac-orange' : 'text-white'}`}>
            {articolo.quantita}
          </div>
          <div className="text-[9px] text-dac-gray-500">{articolo.unita_misura}</div>
        </div>
        <div className="rounded-lg p-2 text-center bg-white/3">
          <div className="text-[9px] text-dac-gray-400 uppercase">Min</div>
          <div className="text-lg font-bold text-dac-gray-300">{articolo.scorta_minima}</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${scaduto ? 'bg-dac-red/10' : inScadenza ? 'bg-dac-orange/10' : 'bg-white/3'}`}>
          <div className="text-[9px] text-dac-gray-400 uppercase">Scadenza</div>
          {articolo.scadenza ? (
            <>
              <div className={`text-xs font-bold ${scaduto ? 'text-dac-red' : inScadenza ? 'text-dac-orange' : 'text-white'}`}>
                {format(new Date(articolo.scadenza), 'dd/MM/yy')}
              </div>
              <div className="text-[9px] text-dac-gray-500">
                {scaduto ? `scaduto ${Math.abs(scadenzaGiorni!)}gg` : `${scadenzaGiorni}gg`}
              </div>
            </>
          ) : (
            <div className="text-xs text-dac-gray-500 pt-1">—</div>
          )}
        </div>
      </div>

      {fornitore && <div className="text-[10px] text-dac-gray-500 mb-2">🏭 {fornitore.nome}</div>}
      {articolo.note && <div className="text-[10px] text-dac-gray-400 italic mb-2 line-clamp-2">{articolo.note}</div>}

      <div className="flex gap-1.5">
        <button onClick={onScarico} disabled={articolo.quantita === 0}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-dac-red/15 text-dac-red hover:bg-dac-red/25 disabled:opacity-30 flex items-center justify-center gap-1">
          <Minus size={12} /> Scarica
        </button>
        <button onClick={onHistory}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 flex items-center justify-center gap-1">
          <History size={12} /> Log
        </button>
      </div>
    </div>
  )
}

function ArticoloForm({ articolo, fornitori, onClose, onSaved }:
  { articolo: Articolo | null; fornitori: Fornitore[]; onClose: () => void; onSaved: () => void }) {

  const [nome, setNome] = useState(articolo?.nome ?? '')
  const [categoria, setCategoria] = useState(articolo?.categoria ?? 'Medicazione')
  const [quantita, setQuantita] = useState<number | ''>(articolo?.quantita ?? '')
  const [unita, setUnita] = useState(articolo?.unita_misura ?? 'pz')
  const [scortaMin, setScortaMin] = useState<number | ''>(articolo?.scorta_minima ?? '')
  const [scadenza, setScadenza] = useState(articolo?.scadenza ?? '')
  const [lotto, setLotto] = useState(articolo?.lotto ?? '')
  const [fornitoreId, setFornitoreId] = useState(articolo?.fornitore_id ?? '')
  const [note, setNote] = useState(articolo?.note ?? '')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim()) { alert('Nome obbligatorio'); return }
    setSaving(true)
    const payload = {
      nome: nome.trim(),
      categoria,
      quantita: Number(quantita) || 0,
      unita_misura: unita,
      scorta_minima: Number(scortaMin) || 0,
      scadenza: scadenza || null,
      lotto: lotto.trim() || null,
      fornitore_id: fornitoreId || null,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = articolo
      ? await supabase.from('inventario_presidio').update(payload).eq('id', articolo.id)
      : await supabase.from('inventario_presidio').insert({ ...payload, attivo: true })
    setSaving(false)
    if (error) { alert('Errore: ' + error.message); return }
    onSaved()
  }

  async function elimina() {
    if (!articolo) return
    if (!confirm('Eliminare questo articolo? L\'operazione è reversibile.')) return
    await supabase.from('inventario_presidio').update({ attivo: false }).eq('id', articolo.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 bg-dac-card z-10">
          <h3 className="font-display font-bold text-white">{articolo ? '✏️ Modifica' : '➕ Nuovo'} Articolo</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Nome *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" placeholder="Es. Garza sterile 10x10" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Categoria *</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-field">
                {CATEGORIE.filter(c => c !== 'Tutte').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Unità</label>
              <select value={unita} onChange={e => setUnita(e.target.value)} className="input-field">
                {UNITA.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Quantità</label>
              <input type="number" value={quantita} onChange={e => setQuantita(e.target.value === '' ? '' : Number(e.target.value))} className="input-field" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Scorta Minima</label>
              <input type="number" value={scortaMin} onChange={e => setScortaMin(e.target.value === '' ? '' : Number(e.target.value))} className="input-field" min="0" step="0.01" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Scadenza</label>
              <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Lotto</label>
              <input type="text" value={lotto} onChange={e => setLotto(e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Fornitore</label>
            <select value={fornitoreId} onChange={e => setFornitoreId(e.target.value)} className="input-field">
              <option value="">— Seleziona —</option>
              {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field resize-none" rows={2} />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-white/5 sticky bottom-0 bg-dac-card">
          {articolo && (
            <button onClick={elimina} className="p-2.5 rounded-xl bg-dac-red/15 text-dac-red hover:bg-dac-red/25">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || !nome.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-red text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Salva</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScaricoModal({ articolo, operatore, onClose, onSaved }:
  { articolo: Articolo; operatore: Operatore; onClose: () => void; onSaved: () => void }) {

  const [quantita, setQuantita] = useState<number>(1)
  const [motivo, setMotivo] = useState('')
  const [pazienti, setPazienti] = useState<any[]>([])
  const [pazienteId, setPazienteId] = useState('')
  const [pazienteSearch, setPazienteSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (pazienteSearch.length < 2) { setPazienti([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('pazienti')
        .select('id, cognome, nome')
        .or(`cognome.ilike.%${pazienteSearch}%,nome.ilike.%${pazienteSearch}%`)
        .limit(6)
      setPazienti(data ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [pazienteSearch])

  async function salva() {
    if (quantita <= 0) { alert('Quantità deve essere > 0'); return }
    if (quantita > articolo.quantita) { alert(`Disponibili solo ${articolo.quantita} ${articolo.unita_misura}`); return }
    setSaving(true)

    const pazSelezionato = pazienti.find(p => p.id === pazienteId)

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('inventario_presidio').update({
        quantita: articolo.quantita - quantita,
        updated_at: new Date().toISOString()
      }).eq('id', articolo.id),
      supabase.from('presidio_scarichi').insert({
        articolo_id: articolo.id,
        articolo_nome: articolo.nome,
        quantita,
        motivo: motivo.trim() || null,
        paziente_id: pazienteId || null,
        paziente_nome: pazSelezionato ? `${pazSelezionato.cognome} ${pazSelezionato.nome}` : null,
        operatore_nome: operatore.nome,
        operatore_email: operatore.email,
      })
    ])

    setSaving(false)
    if (e1 || e2) { alert('Errore: ' + (e1?.message || e2?.message)); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-display font-bold text-white">➖ Scarica {articolo.nome}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-lg bg-white/3 p-3 text-center">
            <div className="text-[10px] text-dac-gray-400 uppercase mb-1">Disponibili</div>
            <div className="text-2xl font-bold text-white">{articolo.quantita} <span className="text-sm text-dac-gray-400">{articolo.unita_misura}</span></div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Quantità da scaricare *</label>
            <input type="number" value={quantita} onChange={e => setQuantita(Number(e.target.value))} className="input-field text-2xl font-bold text-center" min="0.01" max={articolo.quantita} step="0.01" autoFocus />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Motivo (opzionale)</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} className="input-field" placeholder="Es. Medicazione ferita, consumo interno..." />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Paziente (opzionale)</label>
            <input type="text" value={pazienteSearch} onChange={e => { setPazienteSearch(e.target.value); setPazienteId('') }} className="input-field" placeholder="Cerca cognome..." />
            {pazienti.length > 0 && !pazienteId && (
              <div className="mt-1 bg-dac-deep rounded-lg border border-white/10 overflow-hidden">
                {pazienti.map(p => (
                  <button key={p.id} onClick={() => { setPazienteId(p.id); setPazienteSearch(`${p.cognome} ${p.nome}`); setPazienti([]) }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/5">
                    {p.cognome} {p.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || quantita <= 0 || quantita > articolo.quantita}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-red text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Minus size={14} /> Conferma scarico</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ articolo, onClose }: { articolo: Articolo; onClose: () => void }) {
  const [log, setLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('presidio_scarichi').select('*').eq('articolo_id', articolo.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setLog(data ?? []); setLoading(false) })
  }, [articolo.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-display font-bold text-white">📋 Storico {articolo.nome}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>

        <div className="p-5 overflow-auto flex-1">
          {loading ? <div className="text-center text-dac-gray-500 text-sm">Caricamento...</div>
          : log.length === 0 ? <div className="text-center text-dac-gray-500 text-sm py-8">Nessun movimento registrato</div>
          : (
            <div className="space-y-2">
              {log.map(l => (
                <div key={l.id} className="rounded-lg bg-white/3 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-dac-red">- {l.quantita} {articolo.unita_misura}</span>
                    <span className="text-[10px] text-dac-gray-500">{format(new Date(l.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}</span>
                  </div>
                  <div className="text-[11px] text-dac-gray-300">
                    {l.operatore_nome && <span>👤 {l.operatore_nome}</span>}
                    {l.paziente_nome && <span className="ml-2">• 🧑 {l.paziente_nome}</span>}
                  </div>
                  {l.motivo && <div className="text-[11px] text-dac-gray-400 italic mt-1">{l.motivo}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
