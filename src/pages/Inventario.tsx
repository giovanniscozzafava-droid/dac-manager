import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format } from 'date-fns'
import {
  FlaskConical, Plus, X, Search, Check, AlertTriangle,
  Package, Clock, Filter, Edit3, Trash2, ShoppingCart
} from 'lucide-react'

interface Item {
  id: string
  codice: string
  marca: string
  prodotto: string
  sottocategoria: string
  lotto: string | null
  in_macchina: number
  sfusi: number
  confezioni: number
  pz_x_conf: number
  totale_pz: number
  unita: string
  soglia_min: number
  costo_unitario: number
  scadenza: string | null
  ultimo_ordine: string | null
  stato: string
  note: string | null
  fornitore_id: string | null
}

interface Fornitore { id: string; nome: string; attivo: boolean }

interface Props { operatore: Operatore }

const MARCHE = ['REALY', 'SNIBE', 'KIT']
const UNITA = ['Card', 'Reagente', 'Pz', 'Scatola', 'Flacone', 'Kit']
const SOTTOCATEGORIE = [
  'Ormoni', 'Marcatori tumorali', 'Immunologia', 'Vitamine e minerali',
  'Chimica clinica', 'Epatico', 'Infiammazione', 'Pancreatico', 'Renale/muscolare',
  'Aminoacidi', 'Emoglobina glicata', 'QC e calibratori', 'Ausiliari',
  'Coagulazione', 'Microbiologia', 'Sierologia', 'Intolleranze', 'Colture'
]

const MARCA_COLORS: Record<string, { bg: string; text: string }> = {
  'REALY': { bg: 'rgba(46,134,193,0.12)', text: '#2e86c1' },
  'SNIBE': { bg: 'rgba(142,68,173,0.12)', text: '#8e44ad' },
  'KIT':   { bg: 'rgba(243,156,18,0.12)', text: '#f39c12' },
}

function statoStyle(stato: string): { bg: string; text: string } {
  if (stato.includes('SCADUTO')) return { bg: 'rgba(231,76,60,0.12)', text: '#e74c3c' }
  if (stato.includes('Non reperibile')) return { bg: 'rgba(192,57,43,0.12)', text: '#c0392b' }
  if (stato.includes('Scorta bassa')) return { bg: 'rgba(243,156,18,0.12)', text: '#f39c12' }
  if (stato.includes('Solo in macchina')) return { bg: 'rgba(241,196,15,0.12)', text: '#f1c40f' }
  if (stato.includes('Scade presto')) return { bg: 'rgba(230,126,34,0.12)', text: '#e67e22' }
  return { bg: 'rgba(39,174,96,0.12)', text: '#27ae60' }
}

function giorniAllaScadenza(scadenza: string | null): number | null {
  if (!scadenza) return null
  const diff = new Date(scadenza).getTime() - new Date().getTime()
  return Math.floor(diff / 86400000)
}

export function Inventario({ operatore }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [fornitori, setFornitori] = useState<Fornitore[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMarca, setFilterMarca] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [selected, setSelected] = useState<Item | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    const [inv, forn] = await Promise.all([
      supabase.from('inventario').select('*').order('marca').order('prodotto'),
      supabase.from('fornitori').select('id,nome,attivo').order('nome'),
    ])
    setItems(inv.data ?? [])
    setFornitori(forn.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const fornMap: Record<string, string> = {}
  fornitori.forEach(f => { fornMap[f.id] = f.nome })

  // Stats
  const totale = items.length
  const ok = items.filter(i => i.stato.includes('OK')).length
  const attenzione = items.filter(i => i.stato.includes('Scorta') || i.stato.includes('Solo') || i.stato.includes('Scade')).length
  const critico = items.filter(i => i.stato.includes('SCADUTO') || i.stato.includes('Non reperibile')).length

  // Filtri
  const filtered = items.filter(i => {
    if (search) {
      const q = search.toLowerCase()
      if (!(i.prodotto + i.lotto + i.marca + i.codice + i.sottocategoria + i.note).toLowerCase().includes(q)) return false
    }
    if (filterMarca && i.marca !== filterMarca) return false
    if (filterCat && i.sottocategoria !== filterCat) return false
    if (filterStato === 'ok' && !i.stato.includes('OK')) return false
    if (filterStato === 'warn' && !i.stato.includes('Scorta') && !i.stato.includes('Solo') && !i.stato.includes('Scade')) return false
    if (filterStato === 'critico' && !i.stato.includes('SCADUTO') && !i.stato.includes('Non reperibile')) return false
    return true
  })

  // Categorie con conteggio
  const catCounts: Record<string, Record<string, number>> = {}
  items.forEach(i => {
    if (!catCounts[i.marca]) catCounts[i.marca] = {}
    catCounts[i.marca][i.sottocategoria] = (catCounts[i.marca][i.sottocategoria] || 0) + 1
  })

  function onSaved() {
    setShowForm(false)
    setEditItem(null)
    setSelected(null)
    loadItems()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-dac-accent" />
            <h1 className="font-display font-bold text-lg text-white">Inventario Laboratorio</h1>
          </div>
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-accent text-white hover:opacity-90 transition-opacity">
            <Plus size={14} /> Nuovo Prodotto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'Totale', value: totale, color: '#3498db', filterVal: '' },
            { label: 'OK', value: ok, color: '#27ae60', filterVal: 'ok' },
            { label: 'Attenzione', value: attenzione, color: '#f39c12', filterVal: 'warn' },
            { label: 'Critico', value: critico, color: '#e74c3c', filterVal: 'critico' },
          ].map(s => (
            <button key={s.label} onClick={() => setFilterStato(filterStato === s.filterVal ? '' : s.filterVal)}
              className={`px-3 py-2 rounded-xl text-center transition-all border
                ${filterStato === s.filterVal ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
              style={{
                background: `${s.color}10`,
                borderColor: filterStato === s.filterVal ? s.color : 'transparent',
              }}>
              <div className="text-lg font-display font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Filtri */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca prodotto, lotto, codice..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
          </div>
          <select value={filterMarca} onChange={e => setFilterMarca(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">Tutte le marche</option>
            {MARCHE.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">Tutte le categorie</option>
            {SOTTOCATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-[10px] text-dac-gray-400">{filtered.length} prodotti</span>
        </div>
      </div>

      {/* Tabella */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-white/3 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dac-gray-500">
            <FlaskConical size={40} className="opacity-20 mb-3" />
            <p className="text-sm">Nessun prodotto trovato</p>
          </div>
        ) : (
          <table className="w-full min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-dac-deep border-b border-white/10">
                <th className="th-cell">Codice</th>
                <th className="th-cell">Marca</th>
                <th className="th-cell">Prodotto</th>
                <th className="th-cell">Categoria</th>
                <th className="th-cell text-center">🔬Macch.</th>
                <th className="th-cell text-center">📦Sfusi</th>
                <th className="th-cell text-center">📦Conf.</th>
                <th className="th-cell text-center">Totale</th>
                <th className="th-cell">Scadenza</th>
                <th className="th-cell">Fornitore</th>
                <th className="th-cell">Stato</th>
                <th className="th-cell text-center">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const ss = statoStyle(item.stato)
                const mc = MARCA_COLORS[item.marca] ?? MARCA_COLORS['KIT']
                const gg = giorniAllaScadenza(item.scadenza)
                const isLow = item.totale_pz <= item.soglia_min && item.soglia_min > 0

                return (
                  <tr key={item.id} onClick={() => setSelected(item)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <td className="td-cell">
                      <span className="text-[9px] font-mono text-dac-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{item.codice}</span>
                    </td>
                    <td className="td-cell">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: mc.bg, color: mc.text }}>{item.marca}</span>
                    </td>
                    <td className="td-cell">
                      <div className="text-xs font-semibold text-white">{item.prodotto}</div>
                      {item.lotto && <div className="text-[9px] text-dac-gray-500">Lotto: {item.lotto}</div>}
                    </td>
                    <td className="td-cell">
                      <span className="text-[10px] text-dac-gray-400">{item.sottocategoria}</span>
                    </td>
                    <td className="td-cell text-center">
                      <span className={`text-xs ${item.in_macchina > 0 ? 'font-bold text-white' : 'text-dac-gray-500/30'}`}>{item.in_macchina}</span>
                    </td>
                    <td className="td-cell text-center">
                      <span className={`text-xs ${item.sfusi > 0 ? 'text-white' : 'text-dac-gray-500/30'}`}>{item.sfusi}</span>
                    </td>
                    <td className="td-cell text-center">
                      <span className={`text-xs ${item.confezioni > 0 ? 'font-bold text-dac-accent' : 'text-dac-gray-500/30'}`}>{item.confezioni}</span>
                    </td>
                    <td className="td-cell text-center">
                      <span className={`text-sm font-bold ${isLow ? 'text-dac-red' : 'text-white'}`}>{item.totale_pz}</span>
                      <span className="text-[8px] text-dac-gray-500 ml-1">{item.unita}</span>
                    </td>
                    <td className="td-cell">
                      {item.scadenza ? (
                        <div>
                          <span className="text-[10px] text-dac-gray-300">{format(new Date(item.scadenza), 'dd/MM/yy')}</span>
                          {gg !== null && (
                            <span className={`ml-1 text-[9px] font-bold ${gg < 0 ? 'text-dac-red' : gg < 30 ? 'text-dac-orange' : 'text-dac-gray-500'}`}>
                              ({gg}gg)
                            </span>
                          )}
                        </div>
                      ) : <span className="text-dac-gray-500/30 text-xs">—</span>}
                    </td>
                    <td className="td-cell">
                      <span className="text-[10px] text-dac-gray-400">{item.fornitore_id ? (fornMap[item.fornitore_id] ?? '—') : '—'}</span>
                    </td>
                    <td className="td-cell">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap" style={{ background: ss.bg, color: ss.text }}>
                        {item.stato}
                      </span>
                    </td>
                    <td className="td-cell text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditItem(item); setShowForm(true) }}
                          className="p-1 rounded hover:bg-white/10 text-dac-gray-500 hover:text-white transition-colors" title="Modifica">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={async () => { if (confirm('Eliminare ' + item.prodotto + '?')) { await supabase.from('inventario').delete().eq('id', item.id); loadItems() } }}
                          className="p-1 rounded hover:bg-dac-red/10 text-dac-gray-500 hover:text-dac-red transition-colors" title="Elimina">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form nuovo/modifica */}
      {showForm && (
        <InventarioForm item={editItem} fornitori={fornitori.filter(f => f.attivo)} onClose={() => { setShowForm(false); setEditItem(null) }} onSaved={onSaved} />
      )}

      {/* Dettaglio */}
      {selected && !showForm && (
        <DettaglioItem item={selected} onClose={() => setSelected(null)}
          onEdit={() => { setEditItem(selected); setShowForm(true) }}
          onDeleted={onSaved} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FORM
// ═══════════════════════════════════════════════════════════
function InventarioForm({ item, fornitori, onClose, onSaved }: { item: Item | null; fornitori: Fornitore[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!item
  const [marca, setMarca] = useState(item?.marca ?? 'SNIBE')
  const [prodotto, setProdotto] = useState(item?.prodotto ?? '')
  const [sottocategoria, setSottocategoria] = useState(item?.sottocategoria ?? 'Chimica clinica')
  const [lotto, setLotto] = useState(item?.lotto ?? '')
  const [inMacchina, setInMacchina] = useState(item?.in_macchina ?? 0)
  const [sfusi, setSfusi] = useState(item?.sfusi ?? 0)
  const [confezioni, setConfezioni] = useState(item?.confezioni ?? 0)
  const [pzxConf, setPzxConf] = useState(item?.pz_x_conf ?? 2)
  const [unita, setUnita] = useState(item?.unita ?? 'Reagente')
  const [soglia, setSoglia] = useState(item?.soglia_min ?? 1)
  const [costo, setCosto] = useState(item?.costo_unitario ?? 0)
  const [scadenza, setScadenza] = useState(item?.scadenza ?? '')
  const [fornitoreId, setFornitoreId] = useState<string>(item?.fornitore_id ?? '')
  const [note, setNote] = useState(item?.note ?? '')
  const [saving, setSaving] = useState(false)

  const totale = inMacchina + sfusi + (confezioni * pzxConf)

  async function salva() {
    if (!prodotto.trim()) { alert('Nome prodotto obbligatorio'); return }
    setSaving(true)
    const payload = {
      marca, prodotto: prodotto.trim(), sottocategoria, lotto: lotto || null,
      in_macchina: inMacchina, sfusi, confezioni, pz_x_conf: pzxConf,
      unita, soglia_min: soglia, costo_unitario: costo,
      scadenza: scadenza || null, note: note || null,
    }
    if (isEdit) {
      await supabase.from('inventario').update(payload).eq('id', item!.id)
    } else {
      const codice = marca.substring(0, 3).toUpperCase() + '-' + String(Date.now()).substring(7)
      await supabase.from('inventario').insert({ ...payload, codice })
    }
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <h3 className="font-display font-bold text-white">{isEdit ? '✏️ Modifica' : '➕ Nuovo Prodotto'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Marca</label>
              <select value={marca} onChange={e => setMarca(e.target.value)} className="input-field">
                {MARCHE.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Sottocategoria</label>
              <select value={sottocategoria} onChange={e => setSottocategoria(e.target.value)} className="input-field">
                {SOTTOCATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Prodotto *</label>
            <input type="text" value={prodotto} onChange={e => setProdotto(e.target.value)} className="input-field" placeholder="Nome prodotto" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Lotto</label>
              <input type="text" value={lotto} onChange={e => setLotto(e.target.value)} className="input-field" placeholder="N° lotto" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Unità</label>
              <select value={unita} onChange={e => setUnita(e.target.value)} className="input-field">
                {UNITA.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Quantità */}
          <div className="p-3 rounded-xl bg-white/3 border border-white/5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-2">📦 Disponibilità</div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[9px] text-dac-gray-500 mb-1">In Macchina</label>
                <input type="number" value={inMacchina} onChange={e => setInMacchina(Number(e.target.value) || 0)} min={0} className="input-field text-center" />
              </div>
              <div>
                <label className="block text-[9px] text-dac-gray-500 mb-1">Sfusi</label>
                <input type="number" value={sfusi} onChange={e => setSfusi(Number(e.target.value) || 0)} min={0} className="input-field text-center" />
              </div>
              <div>
                <label className="block text-[9px] text-dac-gray-500 mb-1">Confezioni</label>
                <input type="number" value={confezioni} onChange={e => setConfezioni(Number(e.target.value) || 0)} min={0} className="input-field text-center" />
              </div>
              <div>
                <label className="block text-[9px] text-dac-gray-500 mb-1">Pz×Conf</label>
                <input type="number" value={pzxConf} onChange={e => setPzxConf(Number(e.target.value) || 1)} min={1} className="input-field text-center" />
              </div>
            </div>
            <div className="mt-2 text-center text-sm font-display font-bold text-dac-accent">
              Totale: {totale} {unita}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Soglia min.</label>
              <input type="number" value={soglia} onChange={e => setSoglia(Number(e.target.value) || 0)} min={0} className="input-field text-center" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Costo € unit.</label>
              <input type="number" value={costo} onChange={e => setCosto(Number(e.target.value) || 0)} min={0} step={0.01} className="input-field text-center" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Scadenza</label>
              <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field resize-none" rows={2} placeholder="Note..." />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">Annulla</button>
          <button onClick={salva} disabled={saving || !prodotto.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> {isEdit ? 'Salva' : 'Aggiungi'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// DETTAGLIO
// ═══════════════════════════════════════════════════════════
function DettaglioItem({ item, onClose, onEdit, onDeleted }: {
  item: Item; onClose: () => void; onEdit: () => void; onDeleted: () => void
}) {
  const ss = statoStyle(item.stato)
  const mc = MARCA_COLORS[item.marca] ?? MARCA_COLORS['KIT']
  const gg = giorniAllaScadenza(item.scadenza)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 w-80 h-full bg-dac-card border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
        <div className="px-4 py-4 border-b border-white/5" style={{ background: `${mc.text}10` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: mc.bg, color: mc.text }}>{item.marca}</span>
            <div className="flex gap-1">
              <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400 hover:text-white"><Edit3 size={14} /></button>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-dac-gray-400"><X size={16} /></button>
            </div>
          </div>
          <h3 className="font-display font-bold text-white">{item.prodotto}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-dac-gray-400">{item.codice}</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: ss.bg, color: ss.text }}>{item.stato}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stock box */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/3 border border-white/5">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{item.in_macchina}</div>
              <div className="text-[8px] text-dac-gray-500 uppercase">Macchina</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{item.sfusi}</div>
              <div className="text-[8px] text-dac-gray-500 uppercase">Sfusi</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{item.confezioni}</div>
              <div className="text-[8px] text-dac-gray-500 uppercase">Conf. (×{item.pz_x_conf})</div>
            </div>
            <div className="col-span-3 text-center pt-2 border-t border-white/5">
              <span className={`text-xl font-display font-bold ${item.totale_pz <= item.soglia_min ? 'text-dac-red' : 'text-dac-accent'}`}>
                {item.totale_pz}
              </span>
              <span className="text-xs text-dac-gray-400 ml-1">{item.unita}</span>
              <span className="text-[9px] text-dac-gray-500 ml-2">(min: {item.soglia_min})</span>
            </div>
          </div>

          <DR label="Categoria" value={item.sottocategoria} />
          {item.lotto && <DR label="Lotto" value={item.lotto} />}
          <DR label="Costo unitario" value={`€${item.costo_unitario.toFixed(2)}`} />
          {item.scadenza && (
            <DR label="Scadenza" value={`${format(new Date(item.scadenza), 'dd/MM/yyyy')}${gg !== null ? ` (${gg}gg)` : ''}`} />
          )}
          {item.ultimo_ordine && <DR label="Ultimo ordine" value={format(new Date(item.ultimo_ordine), 'dd/MM/yyyy')} />}
          {item.note && <DR label="Note" value={item.note} />}
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={async () => { if (confirm('Eliminare ' + item.prodotto + '?')) { await supabase.from('inventario').delete().eq('id', item.id); onDeleted() } }}
            className="w-full py-2 rounded-xl text-xs font-semibold text-dac-red bg-dac-red/10 hover:bg-dac-red/20 transition-colors">
            🗑️ Elimina
          </button>
        </div>
      </div>
    </>
  )
}

function DR({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-white/[0.03]">
      <span className="text-[10px] text-dac-gray-500">{label}</span>
      <span className="text-xs text-white text-right max-w-[60%]">{value}</span>
    </div>
  )
}
