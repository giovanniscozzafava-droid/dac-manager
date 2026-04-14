import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap, Search, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Save, Check, Settings, Info } from 'lucide-react'

interface Automazione {
  id: string; nome: string; descrizione: string; engine: string; categoria: string
  attivo: boolean; parametri: Record<string, any>; ordine: number
}

const ENGINE_META: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  clinical_brain:    { label: 'Clinical brain',         icon: '🧠', color: '#3498db', desc: 'Workflow clinico, sicurezza, lab, anamnesi, cross-reparto' },
  revenue:           { label: 'Revenue & growth',       icon: '💰', color: '#27ae60', desc: 'Ricavi automatici, cross-selling, upselling, pricing, referral' },
  cost:              { label: 'Cost intelligence',       icon: '📉', color: '#e74c3c', desc: 'Stipendi, budget, break-even, HR intelligence' },
  supply_chain:      { label: 'Supply chain',            icon: '📦', color: '#f39c12', desc: 'Inventario predittivo, quality control, fornitori' },
  patient_lifecycle: { label: 'Patient lifecycle & CRM', icon: '🧬', color: '#8e44ad', desc: 'Acquisizione, scoring, recall, fidelizzazione, med. lavoro' },
  reporting:         { label: 'Reporting & compliance',  icon: '📊', color: '#888780', desc: 'Report automatici, compliance, documentazione' },
}

export function AutomazioniPanel() {
  const [items, setItems] = useState<Automazione[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedEngine, setExpandedEngine] = useState<string | null>('clinical_brain')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [savingParams, setSavingParams] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState('')
  const [filterAttive, setFilterAttive] = useState<'' | 'on' | 'off'>('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('automazioni').select('*').order('ordine')
    setItems(data ?? []); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Toggle on/off
  async function toggleAttivo(id: string, attivo: boolean) {
    await supabase.from('automazioni').update({ attivo: !attivo }).eq('id', id)
    setItems(prev => prev.map(a => a.id === id ? { ...a, attivo: !attivo } : a))
  }

  // Salva parametri
  async function salvaParametri(id: string, parametri: Record<string, any>) {
    setSavingParams(id)
    await supabase.from('automazioni').update({ parametri }).eq('id', id)
    setItems(prev => prev.map(a => a.id === id ? { ...a, parametri } : a))
    setSavingParams(null)
    setSavedMsg(id)
    setTimeout(() => setSavedMsg(''), 1500)
  }

  // Attiva/disattiva tutte per engine
  async function toggleEngine(engine: string, attiva: boolean) {
    const ids = items.filter(a => a.engine === engine).map(a => a.id)
    await supabase.from('automazioni').update({ attivo: attiva }).in('id', ids)
    setItems(prev => prev.map(a => ids.includes(a.id) ? { ...a, attivo: attiva } : a))
  }

  // Filtro
  const filtered = items.filter(a => {
    if (filterAttive === 'on' && !a.attivo) return false
    if (filterAttive === 'off' && a.attivo) return false
    if (search) {
      const q = search.toLowerCase()
      return a.nome.toLowerCase().includes(q) || a.descrizione.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
    }
    return true
  })

  // Raggruppa per engine → categoria
  const engines = Object.keys(ENGINE_META)
  const totAttive = items.filter(a => a.attivo).length

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs text-dac-gray-400">{totAttive}/{items.length} attive</span>
          <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-dac-accent rounded-full transition-all" style={{ width: `${(totAttive / Math.max(items.length, 1)) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterAttive} onChange={e => setFilterAttive(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">Tutte</option>
            <option value="on">Solo attive</option>
            <option value="off">Solo disattivate</option>
          </select>
        </div>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dac-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cerca automazione per nome, descrizione o ID..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
      </div>

      {loading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/3 animate-pulse" />)}</div> :

      /* Engines */
      engines.map(engine => {
        const meta = ENGINE_META[engine]
        const engineItems = filtered.filter(a => a.engine === engine)
        if (engineItems.length === 0 && search) return null
        const engineAttive = engineItems.filter(a => a.attivo).length
        const isExpanded = expandedEngine === engine

        // Raggruppa per categoria
        const categorie: Record<string, Automazione[]> = {}
        engineItems.forEach(a => { if (!categorie[a.categoria]) categorie[a.categoria] = []; categorie[a.categoria].push(a) })

        return (
          <div key={engine} className="rounded-xl border border-white/5 overflow-hidden">
            {/* Engine header */}
            <button onClick={() => setExpandedEngine(isExpanded ? null : engine)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
              style={{ background: `${meta.color}06` }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{meta.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{meta.label}</div>
                  <div className="text-[10px] text-dac-gray-400">{meta.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${meta.color}15`, color: meta.color }}>
                  {engineAttive}/{engineItems.length}
                </span>
                {/* Attiva/disattiva tutte */}
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleEngine(engine, true)} className="text-[8px] px-2 py-0.5 rounded bg-dac-green/10 text-dac-green hover:bg-dac-green/20">ON tutte</button>
                  <button onClick={() => toggleEngine(engine, false)} className="text-[8px] px-2 py-0.5 rounded bg-dac-red/10 text-dac-red hover:bg-dac-red/20">OFF tutte</button>
                </div>
                {isExpanded ? <ChevronDown size={16} className="text-dac-gray-400" /> : <ChevronRight size={16} className="text-dac-gray-400" />}
              </div>
            </button>

            {/* Engine body */}
            {isExpanded && (
              <div className="border-t border-white/5">
                {Object.entries(categorie).map(([cat, catItems]) => (
                  <div key={cat}>
                    <div className="px-4 py-1.5 bg-white/[0.02]">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-dac-gray-500">{cat}</span>
                    </div>
                    {catItems.map(auto => (
                      <AutomazioneRow key={auto.id} auto={auto}
                        isExpanded={expandedItem === auto.id}
                        onToggle={() => toggleAttivo(auto.id, auto.attivo)}
                        onExpand={() => setExpandedItem(expandedItem === auto.id ? null : auto.id)}
                        onSaveParams={(p) => salvaParametri(auto.id, p)}
                        saving={savingParams === auto.id}
                        saved={savedMsg === auto.id}
                        engineColor={meta.color}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// RIGA SINGOLA AUTOMAZIONE
// ═══════════════════════════════════════════════════════════
function AutomazioneRow({ auto, isExpanded, onToggle, onExpand, onSaveParams, saving, saved, engineColor }: {
  auto: Automazione; isExpanded: boolean; onToggle: () => void; onExpand: () => void
  onSaveParams: (p: Record<string, any>) => void; saving: boolean; saved: boolean; engineColor: string
}) {
  const [localParams, setLocalParams] = useState(auto.parametri)
  const hasParams = Object.keys(auto.parametri).length > 0

  function updateParam(key: string, value: any) {
    setLocalParams(p => ({ ...p, [key]: value }))
  }

  return (
    <div className={`border-b border-white/[0.02] ${auto.attivo ? '' : 'opacity-50'}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
        {/* Toggle */}
        <button onClick={onToggle} className="flex-shrink-0">
          {auto.attivo ? <ToggleRight size={22} className="text-dac-green" /> : <ToggleLeft size={22} className="text-dac-gray-500" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
          <div className="text-xs font-semibold text-white">{auto.nome}</div>
          <div className="text-[10px] text-dac-gray-400 line-clamp-1">{auto.descrizione}</div>
        </div>

        {/* Expand button */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasParams && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-dac-gray-500">
              <Settings size={9} className="inline" /> config
            </span>
          )}
          <button onClick={onExpand} className="p-1 rounded hover:bg-white/5 text-dac-gray-500">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded: descrizione + parametri */}
      {isExpanded && (
        <div className="px-4 pb-3 ml-10 space-y-3">
          {/* Descrizione completa */}
          <div className="px-3 py-2 rounded-lg bg-white/[0.02] border-l-2" style={{ borderColor: engineColor }}>
            <div className="flex items-start gap-1.5">
              <Info size={11} className="text-dac-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-dac-gray-300 leading-relaxed">{auto.descrizione}</p>
            </div>
            <div className="mt-1.5 text-[8px] text-dac-gray-500 font-mono">ID: {auto.id}</div>
          </div>

          {/* Parametri configurabili */}
          {hasParams && (
            <div className="space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-dac-gray-500">Parametri configurabili</div>
              {Object.entries(localParams).map(([key, value]) => (
                <ParamField key={key} paramKey={key} value={value} onChange={(v) => updateParam(key, v)} />
              ))}
              <button onClick={() => onSaveParams(localParams)} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all bg-dac-accent/10 text-dac-accent hover:bg-dac-accent/20 disabled:opacity-50">
                {saving ? <div className="w-3 h-3 border border-dac-accent/30 border-t-dac-accent rounded-full animate-spin" />
                  : saved ? <><Check size={11} /> Salvato!</>
                  : <><Save size={11} /> Salva parametri</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CAMPO PARAMETRO GENERICO
// ═══════════════════════════════════════════════════════════
function ParamField({ paramKey, value, onChange }: { paramKey: string; value: any; onChange: (v: any) => void }) {
  const label = paramKey.replace(/_/g, ' ').replace(/pct/g, '%')

  // Oggetto complesso → JSON textarea
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return (
      <div>
        <label className="block text-[9px] text-dac-gray-500 mb-1">{label}</label>
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={e => { try { onChange(JSON.parse(e.target.value)) } catch {} }}
          className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white font-mono focus:outline-none focus:border-dac-accent/50 resize-none"
          rows={Math.min(Object.keys(value).length + 2, 8)}
        />
      </div>
    )
  }

  // Array → JSON inline
  if (Array.isArray(value)) {
    return (
      <div>
        <label className="block text-[9px] text-dac-gray-500 mb-1">{label}</label>
        <input type="text"
          value={JSON.stringify(value)}
          onChange={e => { try { onChange(JSON.parse(e.target.value)) } catch {} }}
          className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white font-mono focus:outline-none focus:border-dac-accent/50"
        />
      </div>
    )
  }

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-[9px] text-dac-gray-500">{label}</label>
        <button onClick={() => onChange(!value)}>
          {value ? <ToggleRight size={18} className="text-dac-green" /> : <ToggleLeft size={18} className="text-dac-gray-500" />}
        </button>
      </div>
    )
  }

  // Numero
  if (typeof value === 'number') {
    return (
      <div className="flex items-center gap-3">
        <label className="text-[9px] text-dac-gray-500 min-w-[100px]">{label}</label>
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
          className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white text-center focus:outline-none focus:border-dac-accent/50" />
      </div>
    )
  }

  // Stringa
  return (
    <div className="flex items-center gap-3">
      <label className="text-[9px] text-dac-gray-500 min-w-[100px]">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white focus:outline-none focus:border-dac-accent/50" />
    </div>
  )
}
