import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { TrendingDown, Plus, X, Check, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

interface Costo { id: string; codice: string; data: string; categoria: string; descrizione: string; importo: number; fornitore: string | null; metodo: string | null; trigger_da: string | null; note: string | null }
interface Props { operatore: Operatore }

const CATEGORIE = ['Personale', 'Affitto', 'Utenze', 'Forniture mediche', 'Reagenti', 'Manutenzione', 'Assicurazioni', 'Marketing', 'Consulenze', 'Altro']
const METODI = ['Contanti', 'POS', 'Bonifico', 'Satispay', 'Assegno', 'Altro']

export function CostiPage({ operatore }: Props) {
  const [items, setItems] = useState<Costo[]>([])
  const [loading, setLoading] = useState(true)
  const [mese, setMese] = useState(startOfMonth(new Date()))
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const meseStr = format(mese, 'yyyy-MM-dd')
  const fineStr = format(endOfMonth(mese), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('costi').select('*').gte('data', meseStr).lte('data', fineStr).order('data', { ascending: false })
    setItems(data ?? []); setLoading(false)
  }, [meseStr, fineStr])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(c => {
    if (filterCat && c.categoria !== filterCat) return false
    if (search && !c.descrizione.toLowerCase().includes(search.toLowerCase()) && !(c.fornitore?.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const totale = filtered.reduce((s, c) => s + Number(c.importo), 0)
  const perCat = CATEGORIE.map(cat => ({ cat, tot: filtered.filter(c => c.categoria === cat).reduce((s, c) => s + Number(c.importo), 0) })).filter(c => c.tot > 0)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-dac-red" />
            <h1 className="font-display font-bold text-lg text-white">Costi</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-red text-white hover:opacity-90"><Plus size={14} /> Nuovo</button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => setMese(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronLeft size={16} /></button>
          <span className="font-display font-bold text-white text-sm min-w-[140px] text-center">{format(mese, 'MMMM yyyy', { locale: it })}</span>
          <button onClick={() => setMese(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronRight size={16} /></button>
          <div className="ml-4 px-3 py-1.5 rounded-xl bg-dac-red/10 text-dac-red font-display font-bold text-lg">€{totale.toLocaleString('it-IT')}</div>
        </div>
        {perCat.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {perCat.map(c => (
              <button key={c.cat} onClick={() => setFilterCat(filterCat === c.cat ? '' : c.cat)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${filterCat === c.cat ? 'bg-dac-accent/15 text-dac-accent' : 'bg-white/5 text-dac-gray-400'}`}>
                {c.cat}: €{c.tot.toLocaleString('it-IT')}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-white/3 animate-pulse" />)}</div>
        : filtered.length === 0 ? <div className="text-center py-16 text-dac-gray-500 text-sm">Nessun costo questo mese</div>
        : <div className="divide-y divide-white/[0.03]">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-4 lg:px-6 py-3 hover:bg-white/[0.03] transition-colors">
              <div className="w-12 text-xs font-mono text-dac-gray-400">{format(new Date(c.data), 'dd/MM')}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{c.descrizione}</div>
                <div className="text-[10px] text-dac-gray-400">
                  {c.categoria}{c.fornitore ? ` • ${c.fornitore}` : ''}{c.trigger_da ? ` • 🤖 ${c.trigger_da}` : ''}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-dac-red">€{Number(c.importo).toLocaleString('it-IT')}</div>
                {c.metodo && <div className="text-[9px] text-dac-gray-500">{c.metodo}</div>}
              </div>
              <button onClick={async () => { if (confirm('Eliminare?')) { await supabase.from('costi').delete().eq('id', c.id); load() } }}
                className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red flex-shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>}
      </div>

      {showForm && <CostoForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function CostoForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categoria, setCategoria] = useState('Altro')
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState(0)
  const [fornitore, setFornitore] = useState('')
  const [metodo, setMetodo] = useState('Bonifico')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!descrizione.trim() || !importo) return
    setSaving(true)
    await supabase.from('costi').insert({ codice: 'CST-' + format(new Date(), 'yyMMddHHmmss'), data, categoria, descrizione: descrizione.trim(), importo, fornitore: fornitore || null, metodo, note: note || null })
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5"><h3 className="font-display font-bold text-white">📉 Nuovo Costo</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Data</label><input type="date" value={data} onChange={e => setData(e.target.value)} className="input-field" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-field">{CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Descrizione *</label><input type="text" value={descrizione} onChange={e => setDescrizione(e.target.value)} className="input-field" placeholder="Es. Ordine reagenti SNIBE" autoFocus /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Importo € *</label><input type="number" value={importo} onChange={e => setImporto(Number(e.target.value))} className="input-field text-center" min={0} step={0.01} /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Fornitore</label><input type="text" value={fornitore} onChange={e => setFornitore(e.target.value)} className="input-field" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Pagamento</label><select value={metodo} onChange={e => setMetodo(e.target.value)} className="input-field">{METODI.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label><input type="text" value={note} onChange={e => setNote(e.target.value)} className="input-field" /></div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || !descrizione.trim() || !importo} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-red text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Registra</>}
          </button>
        </div>
      </div>
    </div>
  )
}
