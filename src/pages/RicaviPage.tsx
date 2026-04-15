import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import { DollarSign, Plus, X, Check, Search, ChevronLeft, ChevronRight, Trash2, TrendingUp } from 'lucide-react'

interface Ricavo { id: string; codice: string; data: string; paziente_nome: string | null; servizio_nome: string; reparto: string | null; operatore_nome: string | null; importo: number; metodo: string | null; note: string | null }
interface Props { operatore: Operatore }

const REPARTI = ['Laboratorio', 'Estetica', 'Med. Estetica', 'Med. Lavoro', 'Specialisti', 'Parafarmacia']
const METODI = ['Contanti', 'POS', 'Bonifico', 'Satispay', 'Altro']

export function RicaviPage({ operatore }: Props) {
  const [items, setItems] = useState<Ricavo[]>([])
  const [loading, setLoading] = useState(true)
  const [mese, setMese] = useState(startOfMonth(new Date()))
  const [filterRep, setFilterRep] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const meseStr = format(mese, 'yyyy-MM-dd')
  const fineStr = format(endOfMonth(mese), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('ricavi').select('*').gte('data', meseStr).lte('data', fineStr).order('data', { ascending: false })
    setItems(data ?? []); setLoading(false)
  }, [meseStr, fineStr])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(r => {
    if (filterRep && r.reparto !== filterRep) return false
    if (search && !(r.paziente_nome?.toLowerCase().includes(search.toLowerCase())) && !r.servizio_nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totale = filtered.reduce((s, r) => s + Number(r.importo), 0)
  const perReparto = REPARTI.map(rep => ({ rep, tot: filtered.filter(r => r.reparto === rep).reduce((s, r) => s + Number(r.importo), 0) })).filter(r => r.tot > 0)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-dac-green" />
            <h1 className="font-display font-bold text-lg text-white">Ricavi</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-green text-white hover:opacity-90"><Plus size={14} /> Nuovo</button>
        </div>
        {/* Navigazione mese */}
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => setMese(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronLeft size={16} /></button>
          <span className="font-display font-bold text-white text-sm min-w-[140px] text-center">{format(mese, 'MMMM yyyy', { locale: it })}</span>
          <button onClick={() => setMese(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronRight size={16} /></button>
          <div className="ml-4 px-3 py-1.5 rounded-xl bg-dac-green/10 text-dac-green font-display font-bold text-lg">€{totale.toLocaleString('it-IT')}</div>
        </div>
        {/* Mini stats per reparto */}
        {perReparto.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {perReparto.map(r => (
              <button key={r.rep} onClick={() => setFilterRep(filterRep === r.rep ? '' : r.rep)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${filterRep === r.rep ? 'bg-dac-accent/15 text-dac-accent' : 'bg-white/5 text-dac-gray-400'}`}>
                {r.rep}: €{r.tot.toLocaleString('it-IT')}
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
        : filtered.length === 0 ? <div className="text-center py-16 text-dac-gray-500 text-sm">Nessun ricavo questo mese</div>
        : <div className="divide-y divide-white/[0.03]">
          {filtered.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-4 lg:px-6 py-3 hover:bg-white/[0.03] transition-colors">
              <div className="w-12 text-xs font-mono text-dac-gray-400">{format(new Date(r.data), 'dd/MM')}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{r.servizio_nome}</div>
                <div className="text-[10px] text-dac-gray-400">{r.paziente_nome ?? '—'} • {r.operatore_nome ?? '—'} {r.reparto ? `• ${r.reparto}` : ''}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-bold ${Number(r.importo) < 0 ? 'text-dac-red' : 'text-dac-green'}`}>€{Number(r.importo).toLocaleString('it-IT')}</div>
                {r.metodo && <div className="text-[9px] text-dac-gray-500">{r.metodo}</div>}
              </div>
              <button onClick={async () => { if (confirm('Eliminare ricavo? Se auto-generato potrebbe ricrearsi.')) { await supabase.from('ricavi').delete().eq('id', r.id); load() } }}
                className="p-1.5 rounded-md hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red flex-shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>}
      </div>

      {showForm && <RicavoForm operatore={operatore} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function RicavoForm({ operatore, onClose, onSaved }: { operatore: Operatore; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paziente, setPaziente] = useState('')
  const [servizio, setServizio] = useState('')
  const [reparto, setReparto] = useState('')
  const [importo, setImporto] = useState(0)
  const [metodo, setMetodo] = useState('Contanti')
  const [note, setNote] = useState('')
  const [servizi, setServizi] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { supabase.from('servizi').select('nome, prezzo, reparto').order('nome').then(({ data }) => setServizi(data ?? [])) }, [])

  function onServizio(nome: string) {
    setServizio(nome)
    const s = servizi.find(x => x.nome === nome)
    if (s) { setImporto(s.prezzo); setReparto(s.reparto) }
  }

  async function salva() {
    if (!servizio.trim() || !importo) return
    setSaving(true)
    await supabase.from('ricavi').insert({ codice: 'RIC-' + format(new Date(), 'yyMMddHHmmss'), data, paziente_nome: paziente || null, servizio_nome: servizio, reparto: reparto || null, operatore_nome: operatore.nome, importo, metodo, note: note || null })
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5"><h3 className="font-display font-bold text-white">💰 Nuovo Ricavo</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Data</label><input type="date" value={data} onChange={e => setData(e.target.value)} className="input-field" /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Paziente</label><input type="text" value={paziente} onChange={e => setPaziente(e.target.value)} className="input-field" placeholder="Nome paziente" /></div>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Servizio *</label><select value={servizio} onChange={e => onServizio(e.target.value)} className="input-field"><option value="">Seleziona...</option>{servizi.map(s => <option key={s.nome} value={s.nome}>{s.nome} — €{s.prezzo}</option>)}</select></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Importo € *</label><input type="number" value={importo} onChange={e => setImporto(Number(e.target.value))} className="input-field text-center" min={0} step={0.01} /></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Pagamento</label><select value={metodo} onChange={e => setMetodo(e.target.value)} className="input-field">{METODI.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Reparto</label><select value={reparto} onChange={e => setReparto(e.target.value)} className="input-field"><option value="">—</option>{REPARTI.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          </div>
          <div><label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label><input type="text" value={note} onChange={e => setNote(e.target.value)} className="input-field" /></div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={salva} disabled={saving || !servizio.trim() || !importo} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-green text-white hover:opacity-90 disabled:opacity-30 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Registra</>}
          </button>
        </div>
      </div>
    </div>
  )
}
