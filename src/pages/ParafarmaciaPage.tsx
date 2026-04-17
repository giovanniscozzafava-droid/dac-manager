import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { format, subDays, addDays, isToday } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Store, Plus, X, Check, Search, ChevronLeft, ChevronRight,
  Trash2, Edit3, AlertTriangle
} from 'lucide-react'

interface CassaItem {
  id: string; data: string; tipo: string; importo: number
  metodo: string | null; operatore_nome: string | null; descrizione: string | null; note: string | null
}

interface ProdottoParafarmacia {
  id: string; codice: string; prodotto: string; categoria: string | null
  marca: string | null; quantita: number; soglia_min: number
  prezzo_acquisto: number | null; prezzo_vendita: number | null
  aliquota_iva: number | null
  scadenza: string | null; fornitore: string | null; fornitore_id: string | null; note: string | null
}

interface Fornitore { id: string; nome: string; attivo: boolean }

interface Props { operatore: Operatore }

const METODI = ['Contanti', 'POS', 'Bonifico', 'Satispay', 'Altro']
const CATEGORIE_PROD = ['Dermatologici', 'Solari', 'Integratori', 'Cosmetici', 'Igiene', 'Medicali', 'Veterinari', 'Altro']
const ALIQUOTE_IVA = [
  { value: 22, label: '22% — Ordinaria' },
  { value: 10, label: '10% — Ridotta (prod. sanitari, cosmetici)' },
  { value: 4, label: '4% — Super ridotta (prod. prima necessità)' },
  { value: 0, label: '0% — Esente (dispositivi medici CE)' },
]

export function ParafarmaciaPage({ operatore }: Props) {
  const [tab, setTab] = useState<'cassa' | 'magazzino'>('cassa')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-dac-purple" />
          <h1 className="font-display font-bold text-lg text-white">Parafarmacia</h1>
        </div>
        <div className="flex gap-1 mt-3">
          <button onClick={() => setTab('cassa')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'cassa' ? 'bg-dac-accent/15 text-dac-accent' : 'text-dac-gray-400 hover:text-white hover:bg-white/5'}`}>
            💰 Chiusura Cassa
          </button>
          <button onClick={() => setTab('magazzino')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'magazzino' ? 'bg-dac-accent/15 text-dac-accent' : 'text-dac-gray-400 hover:text-white hover:bg-white/5'}`}>
            📦 Magazzino
          </button>
        </div>
      </div>
      {tab === 'cassa' ? <CassaTab operatore={operatore} /> : <MagazzinoTab operatore={operatore} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB CASSA
// ═══════════════════════════════════════════════════════════
function CassaTab({ operatore }: { operatore: Operatore }) {
  const [items, setItems] = useState<CassaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: rows } = await supabase.from('parafarmacia_cassa').select('*').eq('data', data).order('created_at', { ascending: false })
    setItems(rows ?? []); setLoading(false)
  }, [data])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load)

  const entrate = items.filter(i => i.tipo === 'Entrata').reduce((s, i) => s + Number(i.importo), 0)
  const uscite = items.filter(i => i.tipo === 'Uscita').reduce((s, i) => s + Number(i.importo), 0)
  const saldo = entrate - uscite

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => setData(d => format(subDays(new Date(d), 1), 'yyyy-MM-dd'))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronLeft size={16} /></button>
            <button onClick={() => setData(format(new Date(), 'yyyy-MM-dd'))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isToday(new Date(data)) ? 'bg-dac-accent text-white' : 'bg-white/5 text-dac-gray-300'}`}>Oggi</button>
            <button onClick={() => setData(d => format(addDays(new Date(d), 1), 'yyyy-MM-dd'))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronRight size={16} /></button>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
            <span className="text-sm font-display font-bold text-white ml-2">{format(new Date(data), 'EEEE d MMMM', { locale: it })}</span>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90"><Plus size={14} /> Registra</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="px-3 py-2.5 rounded-xl bg-dac-green/8 border border-dac-green/10 text-center">
            <div className="text-lg font-display font-bold text-dac-green">€{entrate.toLocaleString('it-IT')}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-dac-green/60">Entrate</div>
          </div>
          <div className="px-3 py-2.5 rounded-xl bg-dac-red/8 border border-dac-red/10 text-center">
            <div className="text-lg font-display font-bold text-dac-red">€{uscite.toLocaleString('it-IT')}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-dac-red/60">Uscite</div>
          </div>
          <div className="px-3 py-2.5 rounded-xl bg-dac-accent/8 border border-dac-accent/10 text-center">
            <div className={`text-lg font-display font-bold ${saldo >= 0 ? 'text-dac-green' : 'text-dac-red'}`}>€{saldo.toLocaleString('it-IT')}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-dac-accent/60">Saldo</div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? <div className="p-6 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-white/3 animate-pulse" />)}</div>
        : items.length === 0 ? <div className="text-center py-16 text-dac-gray-500 text-sm">Nessun movimento</div>
        : <div className="divide-y divide-white/[0.03]">{items.map(item => (
          <div key={item.id} className="flex items-center gap-4 px-4 lg:px-6 py-3 hover:bg-white/[0.03]">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${item.tipo === 'Entrata' ? 'bg-dac-green/10' : 'bg-dac-red/10'}`}>{item.tipo === 'Entrata' ? '💰' : '📤'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{item.tipo}</div>
              <div className="text-[10px] text-dac-gray-400">{item.operatore_nome ?? '—'}{item.metodo ? ` • ${item.metodo}` : ''}{item.note ? ` • ${item.note}` : ''}</div>
            </div>
            <div className={`text-sm font-bold ${item.tipo === 'Entrata' ? 'text-dac-green' : 'text-dac-red'}`}>{item.tipo === 'Entrata' ? '+' : '-'}€{Number(item.importo).toLocaleString('it-IT')}</div>
            <button onClick={async () => { if (confirm('Eliminare? Il ricavo mirror NON verrà rimosso.')) { await supabase.from('parafarmacia_cassa').delete().eq('id', item.id); load() } }}
              className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={13} /></button>
          </div>
        ))}</div>}
      </div>
      {showForm && <CassaForm data={data} operatore={operatore} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function CassaForm({ data, operatore, onClose, onSaved }: { data: string; operatore: Operatore; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState('Entrata')
  const [importo, setImporto] = useState(0)
  const [metodo, setMetodo] = useState('Contanti')
  const [descrizione, setDescrizione] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!importo || !descrizione.trim()) return; setSaving(true)
    const payload = { data, tipo, importo, metodo, operatore_nome: operatore.nome, descrizione: descrizione.trim(), note: note || null }
    console.log('[CassaForm] insert payload:', payload)
    const { data: inserted, error } = await supabase.from('parafarmacia_cassa').insert(payload).select()
    console.log('[CassaForm] result:', { inserted, error })
    setSaving(false)
    if (error) {
      alert(`Errore salvataggio cassa:\n${error.message}\n${error.details ?? ''}\n${error.hint ?? ''}`)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5"><h3 className="font-display font-bold text-white">💰 Registra Movimento</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button></div>
        <div className="p-5 space-y-3">
          <div className="flex rounded-xl bg-white/5 p-1">
            <button onClick={() => setTipo('Entrata')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${tipo === 'Entrata' ? 'bg-dac-green text-white shadow-lg' : 'text-dac-gray-400'}`}>💰 Entrata</button>
            <button onClick={() => setTipo('Uscita')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${tipo === 'Uscita' ? 'bg-dac-red text-white shadow-lg' : 'text-dac-gray-400'}`}>📤 Uscita</button>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Importo € *</label>
            <input type="number" value={importo || ''} onChange={e => setImporto(Number(e.target.value))} className="input-field text-center text-lg font-bold" min={0} step={0.01} autoFocus /></div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Pagamento</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)} className="input-field">{METODI.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Descrizione movimento *</label>
            <input type="text" value={descrizione} onChange={e => setDescrizione(e.target.value)} className="input-field" placeholder="Es. Vendita Eucerin Crema solare, Acquisto ordine Bayer..." /></div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="input-field" placeholder="Note aggiuntive..." /></div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || !importo || !descrizione.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2 ${tipo === 'Entrata' ? 'bg-dac-green' : 'bg-dac-red'}`}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Registra</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB MAGAZZINO CON IVA
// ═══════════════════════════════════════════════════════════
function MagazzinoTab({ operatore }: { operatore: Operatore }) {
  const [items, setItems] = useState<ProdottoParafarmacia[]>([])
  const [fornitori, setFornitori] = useState<Fornitore[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ProdottoParafarmacia | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [prod, forn] = await Promise.all([
      supabase.from('inventario_parafarmacia').select('*').order('prodotto'),
      supabase.from('fornitori').select('id,nome,attivo').order('nome'),
    ])
    setItems(prod.data ?? [])
    setFornitori(forn.data ?? [])
    setLoading(false)
  }, [])

  const fornMap: Record<string, string> = {}
  fornitori.forEach(f => { fornMap[f.id] = f.nome })

  useEffect(() => { load() }, [load])

  const filtered = items.filter(p => {
    if (search && !(p.prodotto + p.marca + p.categoria).toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && p.categoria !== filterCat) return false
    return true
  })

  const totProdotti = items.length
  const sottosoglia = items.filter(p => p.quantita <= p.soglia_min && p.soglia_min > 0).length
  const valoreTotale = items.reduce((s, p) => s + (Number(p.prezzo_vendita ?? 0) * p.quantita), 0)

  function onSaved() { setShowForm(false); setEditItem(null); load() }
  function gg(scadenza: string | null): number | null { if (!scadenza) return null; return Math.floor((new Date(scadenza).getTime() - Date.now()) / 86400000) }

  // Scorporo IVA: prezzo ivato → imponibile
  function imponibile(prezzoIvato: number | null, iva: number | null): number | null {
    if (!prezzoIvato) return null
    return prezzoIvato / (1 + (iva ?? 22) / 100)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="grid grid-cols-3 gap-2 flex-1">
            <div className="px-3 py-2 rounded-xl bg-dac-accent/8 text-center"><div className="text-lg font-bold text-dac-accent">{totProdotti}</div><div className="text-[8px] text-dac-gray-500 uppercase">Prodotti</div></div>
            <div className="px-3 py-2 rounded-xl bg-dac-orange/8 text-center"><div className={`text-lg font-bold ${sottosoglia > 0 ? 'text-dac-orange' : 'text-dac-green'}`}>{sottosoglia}</div><div className="text-[8px] text-dac-gray-500 uppercase">Sotto soglia</div></div>
            <div className="px-3 py-2 rounded-xl bg-dac-green/8 text-center"><div className="text-lg font-bold text-dac-green">€{valoreTotale.toLocaleString('it-IT')}</div><div className="text-[8px] text-dac-gray-500 uppercase">Valore (IVA incl.)</div></div>
          </div>
          <button onClick={() => { setEditItem(null); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90"><Plus size={14} /> Prodotto</button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca prodotto..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">Tutte</option>{CATEGORIE_PROD.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-white/3 animate-pulse" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-16 text-dac-gray-500 text-sm">Nessun prodotto</div>
        : <table className="w-full min-w-[900px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-dac-deep border-b border-white/10">
              <th className="th-cell">Prodotto</th>
              <th className="th-cell">Categoria</th>
              <th className="th-cell text-center">Qtà</th>
              <th className="th-cell text-center">IVA</th>
              <th className="th-cell text-center">Acquisto</th>
              <th className="th-cell text-center">Vendita (ivato)</th>
              <th className="th-cell text-center">Imponibile</th>
              <th className="th-cell text-center">Margine</th>
              <th className="th-cell">Scadenza</th>
              <th className="th-cell">Fornitore</th>
              <th className="th-cell text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isLow = p.quantita <= p.soglia_min && p.soglia_min > 0
              const iva = p.aliquota_iva ?? 22
              const imp = imponibile(p.prezzo_vendita, iva)
              const margine = (imp && p.prezzo_acquisto && p.prezzo_acquisto > 0) ? ((imp - p.prezzo_acquisto) / imp * 100) : null
              const scadGg = gg(p.scadenza)
              return (
                <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                  <td className="td-cell">
                    <div className="text-xs font-semibold text-white">{p.prodotto}</div>
                    <div className="text-[9px] text-dac-gray-500">{p.marca ?? '—'} • {p.codice}</div>
                  </td>
                  <td className="td-cell"><span className="text-[10px] text-dac-gray-400">{p.categoria ?? '—'}</span></td>
                  <td className="td-cell text-center">
                    <span className={`text-sm font-bold ${isLow ? 'text-dac-red' : 'text-white'}`}>{p.quantita}</span>
                    {isLow && <AlertTriangle size={10} className="inline ml-1 text-dac-orange" />}
                  </td>
                  <td className="td-cell text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${iva === 0 ? 'bg-dac-green/10 text-dac-green' : iva === 4 ? 'bg-dac-teal/10 text-dac-teal' : iva === 10 ? 'bg-dac-orange/10 text-dac-orange' : 'bg-white/5 text-dac-gray-400'}`}>
                      {iva}%
                    </span>
                  </td>
                  <td className="td-cell text-center text-xs text-dac-gray-400">{p.prezzo_acquisto ? `€${Number(p.prezzo_acquisto).toFixed(2)}` : '—'}</td>
                  <td className="td-cell text-center text-xs font-semibold text-white">{p.prezzo_vendita ? `€${Number(p.prezzo_vendita).toFixed(2)}` : '—'}</td>
                  <td className="td-cell text-center text-[10px] text-dac-gray-400">{imp ? `€${imp.toFixed(2)}` : '—'}</td>
                  <td className="td-cell text-center">
                    {margine !== null ? <span className={`text-xs font-bold ${margine >= 30 ? 'text-dac-green' : margine >= 15 ? 'text-dac-orange' : 'text-dac-red'}`}>{margine.toFixed(0)}%</span> : <span className="text-dac-gray-500 text-xs">—</span>}
                  </td>
                  <td className="td-cell">
                    {p.scadenza ? <div><span className="text-[10px] text-dac-gray-300">{format(new Date(p.scadenza), 'dd/MM/yy')}</span>
                      {scadGg !== null && <span className={`ml-1 text-[9px] font-bold ${scadGg < 0 ? 'text-dac-red' : scadGg < 30 ? 'text-dac-orange' : 'text-dac-gray-500'}`}>({scadGg}gg)</span>}
                    </div> : <span className="text-dac-gray-500/30 text-xs">—</span>}
                  </td>
                  <td className="td-cell"><span className="text-[10px] text-dac-gray-400">{p.fornitore_id ? (fornMap[p.fornitore_id] ?? '—') : (p.fornitore ?? '—')}</span></td>
                  <td className="td-cell text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditItem(p); setShowForm(true) }} className="p-1 rounded hover:bg-white/10 text-dac-gray-500 hover:text-white"><Edit3 size={12} /></button>
                      <button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('inventario_parafarmacia').delete().eq('id', p.id); load() } }}
                        className="p-1 rounded hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>}
      </div>

      {showForm && <ProdottoForm item={editItem} fornitori={fornitori} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={onSaved} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FORM PRODOTTO CON IVA
// ═══════════════════════════════════════════════════════════
function ProdottoForm({ item, fornitori, onClose, onSaved }: { item: ProdottoParafarmacia | null; fornitori: Fornitore[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!item
  const [prodotto, setProdotto] = useState(item?.prodotto ?? '')
  const [categoria, setCategoria] = useState(item?.categoria ?? 'Altro')
  const [marca, setMarca] = useState(item?.marca ?? '')
  const [quantita, setQuantita] = useState(item?.quantita ?? 0)
  const [soglia, setSoglia] = useState(item?.soglia_min ?? 1)
  const [pAcquisto, setPAcquisto] = useState(item?.prezzo_acquisto ?? 0)
  const [pVendita, setPVendita] = useState(item?.prezzo_vendita ?? 0)
  const [iva, setIva] = useState(item?.aliquota_iva ?? 22)
  const [scadenza, setScadenza] = useState(item?.scadenza ?? '')
  const [fornitoreId, setFornitoreId] = useState<string>(item?.fornitore_id ?? '')
  const [note, setNote] = useState(item?.note ?? '')
  const [saving, setSaving] = useState(false)

  // Calcoli live
  const imponibile = pVendita > 0 ? pVendita / (1 + iva / 100) : 0
  const ivaEuro = pVendita - imponibile
  const margine = (imponibile > 0 && pAcquisto > 0) ? ((imponibile - pAcquisto) / imponibile * 100) : 0
  const guadagnoUnit = imponibile - (pAcquisto || 0)

  async function salva() {
    if (!prodotto.trim()) return; setSaving(true)
    const payload = {
      prodotto: prodotto.trim(), categoria, marca: marca || null,
      quantita, soglia_min: soglia, prezzo_acquisto: pAcquisto || null,
      prezzo_vendita: pVendita || null, aliquota_iva: iva,
      scadenza: scadenza || null, fornitore_id: fornitoreId || null, fornitore: null, note: note || null,
    }
    if (isEdit) await supabase.from('inventario_parafarmacia').update(payload).eq('id', item!.id)
    else await supabase.from('inventario_parafarmacia').insert({ ...payload, codice: 'PF-' + String(Date.now()).substring(7) })
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-display font-bold text-white">{isEdit ? '✏️ Modifica' : '➕ Nuovo Prodotto'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Prodotto *</label>
            <input type="text" value={prodotto} onChange={e => setProdotto(e.target.value)} className="input-field" placeholder="Nome prodotto" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-field">{CATEGORIE_PROD.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Marca</label>
              <input type="text" value={marca} onChange={e => setMarca(e.target.value)} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Quantità</label>
              <input type="number" value={quantita} onChange={e => setQuantita(Number(e.target.value))} className="input-field text-center" min={0} /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Soglia min.</label>
              <input type="number" value={soglia} onChange={e => setSoglia(Number(e.target.value))} className="input-field text-center" min={0} /></div>
          </div>

          {/* SEZIONE IVA E PREZZI */}
          <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">💰 Prezzi e IVA</div>

            {/* Aliquota IVA */}
            <div>
              <label className="block text-[9px] text-dac-gray-500 mb-1">Aliquota IVA</label>
              <select value={iva} onChange={e => setIva(Number(e.target.value))} className="input-field">
                {ALIQUOTE_IVA.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[9px] text-dac-gray-500 mb-1">Prezzo acquisto € (netto)</label>
                <input type="number" value={pAcquisto || ''} onChange={e => setPAcquisto(Number(e.target.value))} className="input-field text-center" min={0} step={0.01} /></div>
              <div><label className="block text-[9px] text-dac-gray-500 mb-1">Prezzo vendita € (IVA incl.)</label>
                <input type="number" value={pVendita || ''} onChange={e => setPVendita(Number(e.target.value))} className="input-field text-center" min={0} step={0.01} /></div>
            </div>

            {/* Calcoli live */}
            {pVendita > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                <div className="text-center">
                  <div className="text-xs font-bold text-white">€{imponibile.toFixed(2)}</div>
                  <div className="text-[7px] text-dac-gray-500 uppercase">Imponibile</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-dac-orange">€{ivaEuro.toFixed(2)}</div>
                  <div className="text-[7px] text-dac-gray-500 uppercase">IVA ({iva}%)</div>
                </div>
                <div className="text-center">
                  <div className={`text-xs font-bold ${guadagnoUnit >= 0 ? 'text-dac-green' : 'text-dac-red'}`}>€{guadagnoUnit.toFixed(2)}</div>
                  <div className="text-[7px] text-dac-gray-500 uppercase">Guadagno/pz</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-bold ${margine >= 30 ? 'text-dac-green' : margine >= 15 ? 'text-dac-orange' : 'text-dac-red'}`}>{margine.toFixed(0)}%</div>
                  <div className="text-[7px] text-dac-gray-500 uppercase">Margine</div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Scadenza</label>
              <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} className="input-field" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Fornitore</label>
              <select value={fornitoreId} onChange={e => setFornitoreId(e.target.value)} className="input-field [&>option]:bg-dac-deep">
                <option value="">— Nessuno —</option>
                {fornitori.filter(f => f.attivo || f.id === fornitoreId).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select></div>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="input-field" /></div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || !prodotto.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Salva</>}
          </button>
        </div>
      </div>
    </div>
  )
}
