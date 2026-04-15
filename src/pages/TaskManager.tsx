import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format } from 'date-fns'
import {
  CheckSquare, Plus, X, Clock,
  Check, Search, Eye, User
} from 'lucide-react'

interface Task {
  id: string
  codice: string
  tipo: string
  descrizione: string
  priorita: string
  stato: string
  assegnato_a_nome: string
  assegnato_a: string | null
  assegnato_da: string | null
  data_creazione: string
  scadenza: string | null
  ora: string | null
  paziente_nome: string | null
  servizio_nome: string | null
  note: string | null
}

interface Props { operatore: Operatore }

const STATI = ['Da fare', 'In corso', 'In attesa', 'Completato']
const PRIORITA = ['Urgente', 'Alta', 'Media', 'Bassa']
const TIPI = [
  'Accoglienza', 'Anamnesi', 'Visita', 'Referto', 'Follow-up/Recall',
  'Prelievo', 'Analisi', 'Risultati pronti', 'Comunicazione paziente',
  '📞 Segreteria', '🧹 Pulizia', '📦 Magazzino', '🔧 Manutenzione',
  '📄 Amministrazione', '🎯 Libero'
]

const STATO_CONFIG: Record<string, { colore: string; bg: string; icon: string }> = {
  'Da fare':    { colore: '#e74c3c', bg: 'rgba(231,76,60,0.08)', icon: '🔴' },
  'In corso':   { colore: '#f39c12', bg: 'rgba(243,156,18,0.08)', icon: '🟡' },
  'In attesa':  { colore: '#3498db', bg: 'rgba(52,152,219,0.08)', icon: '🔵' },
  'Completato': { colore: '#27ae60', bg: 'rgba(39,174,96,0.08)', icon: '✅' },
}

const PRIO_CONFIG: Record<string, { colore: string; label: string }> = {
  'Urgente': { colore: '#e74c3c', label: '🔴' },
  'Alta':    { colore: '#e67e22', label: '🟠' },
  'Media':   { colore: '#3498db', label: '🔵' },
  'Bassa':   { colore: '#95a5a6', label: '⚪' },
}

function getCountdown(scadenza: string | null, ora: string | null): {
  label: string; color: string; urgente: boolean; scaduto: boolean
} | null {
  if (!scadenza) return null
  const now = new Date()
  const target = new Date(scadenza)
  if (ora) { const [h, m] = ora.split(':').map(Number); target.setHours(h || 9, m || 0, 0, 0) }
  else { target.setHours(23, 59, 59, 0) }
  const diffMs = target.getTime() - now.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffG = Math.floor(diffMs / 86400000)

  if (diffMs < 0) {
    const overH = Math.abs(diffH); const overG = Math.abs(diffG); const overMin = Math.abs(diffMin)
    if (overG > 0) return { label: `⏰ −${overG}g ${overH % 24}h`, color: '#e74c3c', urgente: true, scaduto: true }
    if (overH > 0) return { label: `⏰ −${overH}h ${overMin % 60}m`, color: '#e74c3c', urgente: true, scaduto: true }
    return { label: `⏰ −${overMin}m`, color: '#e74c3c', urgente: true, scaduto: true }
  }
  if (diffG > 7) return { label: `${diffG}g`, color: '#95a5a6', urgente: false, scaduto: false }
  if (diffG > 1) return { label: `${diffG}g ${diffH % 24}h`, color: '#f39c12', urgente: false, scaduto: false }
  if (diffG === 1) return { label: `1g ${diffH % 24}h`, color: '#e67e22', urgente: true, scaduto: false }
  if (diffH > 0) return { label: `${diffH}h ${diffMin % 60}m`, color: '#e74c3c', urgente: true, scaduto: false }
  return { label: `${diffMin}m`, color: '#e74c3c', urgente: true, scaduto: false }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export function TaskManager({ operatore }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [operatori, setOperatori] = useState<{ id: string; nome: string; emoji: string; email: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPersona, setFilterPersona] = useState('')
  const [filterPriorita, setFilterPriorita] = useState('')
  const [soloScaduti, setSoloScaduti] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<Task | null>(null)
  const [tick, setTick] = useState(0)
  const [viewAll, setViewAll] = useState(false)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const isAdmin = operatore.ruolo === 'admin'

  const loadTasks = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('task').select('*').neq('stato', 'Archiviato')
    if (!isAdmin) query = query.eq('assegnato_a_nome', operatore.nome)
    const { data } = await query.order('scadenza', { ascending: true, nullsFirst: false })
    setTasks(data ?? []); setLoading(false)
  }, [isAdmin, operatore.nome])

  useEffect(() => { loadTasks() }, [loadTasks])
  useEffect(() => { supabase.from('operatori').select('id, nome, emoji, email').eq('attivo', true).order('nome').then(({ data }) => setOperatori(data ?? [])) }, [])
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(i) }, [])
  useEffect(() => { const ch = supabase.channel('task-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'task' }, () => loadTasks()).subscribe(); return () => { supabase.removeChannel(ch) } }, [loadTasks])

  function isScaduto(t: Task) { return !!getCountdown(t.scadenza, t.ora)?.scaduto && t.stato !== 'Completato' }

  function filteredTasks(stato: string) {
    return tasks.filter(t => {
      if (t.stato !== stato) return false
      if (isAdmin && !viewAll && filterPersona === '' && t.assegnato_a_nome !== operatore.nome) return false
      if (filterPersona && t.assegnato_a_nome !== filterPersona) return false
      if (filterPriorita && t.priorita !== filterPriorita) return false
      if (soloScaduti && !isScaduto(t)) return false
      if (searchQ) {
        const q = searchQ.toLowerCase()
        if (!t.descrizione.toLowerCase().includes(q) && !(t.paziente_nome?.toLowerCase().includes(q)) && !(t.codice.toLowerCase().includes(q))) return false
      }
      return true
    })
  }

  async function cambiaStato(taskId: string, nuovoStato: string) {
    await supabase.from('task').update({ stato: nuovoStato }).eq('id', taskId)
    setSelected(null); loadTasks()
  }

  async function archivia(taskId: string) {
    await supabase.from('task').update({ stato: 'Archiviato' }).eq('id', taskId)
    setSelected(null); loadTasks()
  }

  // ── DRAG & DROP ──
  function onDragStart(e: React.DragEvent, taskId: string) {
    setDragTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    // Rendi la card semi-trasparente durante il drag
    if (e.currentTarget instanceof HTMLElement) {
      setTimeout(() => { (e.currentTarget as HTMLElement).style.opacity = '0.4' }, 0)
    }
  }

  function onDragEnd(e: React.DragEvent) {
    setDragTaskId(null)
    setDragOverCol(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  function onDragOver(e: React.DragEvent, stato: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(stato)
  }

  function onDragLeave() {
    setDragOverCol(null)
  }

  async function onDrop(e: React.DragEvent, nuovoStato: string) {
    e.preventDefault()
    setDragOverCol(null)
    if (!dragTaskId) return

    const task = tasks.find(t => t.id === dragTaskId)
    if (!task || task.stato === nuovoStato) { setDragTaskId(null); return }

    setDragTaskId(null)
    await cambiaStato(task.id, nuovoStato)
  }

  const myTasks = tasks.filter(t => t.assegnato_a_nome === operatore.nome && t.stato !== 'Completato')
  const myScaduti = myTasks.filter(t => isScaduto(t))
  const totScaduti = tasks.filter(t => isScaduto(t)).length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-dac-accent" />
            <h1 className="font-display font-bold text-lg text-white">
              {isAdmin && viewAll ? 'Task — Tutti' : `Task — ${operatore.nome}`}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-dac-gray-300">{myTasks.length} aperti</span>
            {myScaduti.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dac-red/15 text-dac-red animate-pulse">{myScaduti.length} scadut{myScaduti.length !== 1 ? 'i' : 'o'}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setViewAll(!viewAll)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${viewAll ? 'bg-dac-accent/15 border-dac-accent/30 text-dac-accent' : 'bg-white/5 border-white/10 text-dac-gray-400 hover:text-white'}`}>
                <Eye size={13} /> {viewAll ? '👥 Tutti' : '👤 Solo miei'}
              </button>
            )}
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dac-green text-white hover:opacity-90 transition-opacity">
              <Plus size={14} /> Nuovo
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dac-gray-500" />
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Cerca..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
          </div>
          {isAdmin && viewAll && (
            <select value={filterPersona} onChange={e => setFilterPersona(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
              <option value="">👥 Tutti</option>
              {operatori.map(o => <option key={o.id} value={o.nome}>{o.emoji} {o.nome}</option>)}
            </select>
          )}
          <select value={filterPriorita} onChange={e => setFilterPriorita(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none [&>option]:bg-dac-deep">
            <option value="">Tutte priorità</option>
            {PRIORITA.map(p => <option key={p} value={p}>{PRIO_CONFIG[p].label} {p}</option>)}
          </select>
          <button onClick={() => setSoloScaduti(!soloScaduti)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
              ${soloScaduti ? 'bg-dac-red/15 border-dac-red/30 text-dac-red' : 'bg-white/5 border-white/10 text-dac-gray-400 hover:text-white'}`}>
            ⚠️ Scaduti {isAdmin && viewAll ? `(${totScaduti})` : `(${myScaduti.length})`}
          </button>
        </div>
      </div>

      {/* Kanban con drag & drop */}
      <div className="flex-1 flex gap-3 p-3 lg:p-4 overflow-x-auto overflow-y-hidden">
        {STATI.map(stato => {
          const config = STATO_CONFIG[stato]
          const columnTasks = filteredTasks(stato)
          const isDragOver = dragOverCol === stato
          return (
            <div key={stato}
              className={`flex-1 min-w-[220px] max-w-[320px] flex flex-col rounded-xl overflow-hidden transition-all duration-200
                ${isDragOver ? 'scale-[1.01]' : ''}`}
              style={{
                background: isDragOver ? `${config.colore}10` : 'rgba(255,255,255,0.02)',
                boxShadow: isDragOver ? `0 0 0 2px ${config.colore}` : 'none',
              }}
              onDragOver={e => onDragOver(e, stato)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, stato)}
            >
              <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
                style={{ background: config.bg, borderBottom: `2px solid ${config.colore}30` }}>
                <span className="text-xs font-bold" style={{ color: config.colore }}>{config.icon} {stato}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${config.colore}20`, color: config.colore }}>{columnTasks.length}</span>
              </div>
              <div className={`flex-1 overflow-y-auto p-2 space-y-1.5 transition-all duration-200 ${isDragOver ? 'bg-white/[0.02]' : ''}`}>
                {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-white/3 animate-pulse" />)
                  : columnTasks.length === 0 ? (
                    <div className={`text-center py-8 text-[10px] border-2 border-dashed rounded-xl transition-colors
                      ${isDragOver ? 'border-white/20 text-dac-gray-400' : 'border-transparent text-dac-gray-500'}`}>
                      {isDragOver ? '↓ Rilascia qui' : 'Nessun task'}
                    </div>
                  )
                  : columnTasks.map(task => (
                    <TaskCard key={task.id} task={task} tick={tick} showAssegnato={isAdmin && viewAll}
                      onClick={() => setSelected(task)}
                      onForward={() => { const idx = STATI.indexOf(task.stato); if (idx < STATI.length - 1) cambiaStato(task.id, STATI[idx + 1]) }}
                      onBack={() => { const idx = STATI.indexOf(task.stato); if (idx > 0) cambiaStato(task.id, STATI[idx - 1]) }}
                      onDragStart={e => onDragStart(e, task.id)}
                      onDragEnd={onDragEnd}
                    />
                  ))
                }
              </div>
            </div>
          )
        })}
      </div>

      {selected && <TaskDetail task={selected} tick={tick} onClose={() => setSelected(null)} onCambiaStato={cambiaStato} onArchivia={archivia} onDeleted={() => { setSelected(null); loadTasks() }} />}
      {showNew && <NuovoTaskModal operatori={operatori} operatoreCorrente={operatore} isAdmin={isAdmin} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); loadTasks() }} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CARD DRAGGABLE
// ═══════════════════════════════════════════════════════════
function TaskCard({ task, tick, showAssegnato, onClick, onForward, onBack, onDragStart, onDragEnd }: {
  task: Task; tick: number; showAssegnato: boolean; onClick: () => void
  onForward: () => void; onBack: () => void
  onDragStart: (e: React.DragEvent) => void; onDragEnd: (e: React.DragEvent) => void
}) {
  const prio = PRIO_CONFIG[task.priorita] ?? PRIO_CONFIG['Media']
  const countdown = task.stato !== 'Completato' ? getCountdown(task.scadenza, task.ora) : null

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:-translate-y-0.5
        bg-dac-card/80 border-l-[3px] select-none ${countdown?.scaduto ? 'bg-dac-red/10' : ''}`}
      style={{ borderLeftColor: prio.colore }}>

      {showAssegnato && (
        <div className="flex items-center gap-1 mb-1">
          <User size={9} className="text-dac-gray-400" />
          <span className="text-[8px] font-bold text-dac-gray-500 uppercase tracking-wider">{task.assegnato_a_nome}</span>
        </div>
      )}
      <div className="text-[11px] font-semibold text-white leading-snug mb-1.5 line-clamp-2">{task.descrizione}</div>

      {countdown && (
        <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: countdown.color + '15', color: countdown.color }}>
          <Clock size={9} /> {countdown.scaduto ? countdown.label : `⏱ ${countdown.label}`}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-1.5">
        {task.tipo && task.tipo !== '🎯 Libero' && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-purple-500/15 text-purple-300">{task.tipo}</span>
        )}
        {task.paziente_nome && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-teal-500/15 text-teal-300">{task.paziente_nome}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-[9px] text-dac-gray-400">{!showAssegnato && task.assegnato_da ? `da ${task.assegnato_da}` : ''}</span>
        <div className="flex gap-0.5" onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
          {task.stato !== 'Da fare' && (
            <button onClick={onBack} className="px-1.5 py-0.5 rounded text-[10px] text-dac-gray-400 hover:bg-amber-500/15 hover:text-amber-300 transition-colors">◀</button>
          )}
          {task.stato !== 'Completato' && (
            <button onClick={onForward} className="px-1.5 py-0.5 rounded text-[10px] text-dac-gray-400 hover:bg-green-500/15 hover:text-green-300 transition-colors">▶</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// DETAIL
// ═══════════════════════════════════════════════════════════
function TaskDetail({ task, tick, onClose, onCambiaStato, onArchivia, onDeleted }: {
  task: Task; tick: number; onClose: () => void
  onCambiaStato: (id: string, stato: string) => void; onArchivia: (id: string) => void; onDeleted: () => void
}) {
  const prio = PRIO_CONFIG[task.priorita] ?? PRIO_CONFIG['Media']
  const countdown = task.stato !== 'Completato' ? getCountdown(task.scadenza, task.ora) : null

  async function elimina() {
    if (!confirm('Eliminare questo task?')) return
    await supabase.from('task').delete().eq('id', task.id); onDeleted()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 w-80 h-full bg-dac-card border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
        <div className="px-4 py-4 border-b border-white/5" style={{ background: `linear-gradient(135deg, ${prio.colore}20, transparent)` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-dac-gray-400">{task.codice}</span>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 text-dac-gray-400"><X size={16} /></button>
          </div>
          <h3 className="font-display font-bold text-white text-sm leading-snug">{task.descrizione}</h3>
          {countdown && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: countdown.color + '15', border: `1px solid ${countdown.color}30` }}>
              <Clock size={16} style={{ color: countdown.color }} />
              <div>
                <div className="text-sm font-bold" style={{ color: countdown.color }}>{countdown.label}</div>
                <div className="text-[9px]" style={{ color: countdown.color, opacity: 0.7 }}>{countdown.scaduto ? 'Scaduto' : 'Tempo rimanente'}</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <DR label="Tipo" value={task.tipo} />
          <DR label="Priorità" value={`${prio.label} ${task.priorita}`} />
          <DR label="Assegnato a" value={task.assegnato_a_nome} />
          {task.assegnato_da && <DR label="Assegnato da" value={task.assegnato_da} />}
          <DR label="Creato" value={task.data_creazione ? format(new Date(task.data_creazione), 'dd/MM/yyyy HH:mm') : '—'} />
          {task.scadenza && <DR label="Scadenza" value={format(new Date(task.scadenza), 'dd/MM/yyyy') + (task.ora ? ` ${task.ora.substring(0, 5)}` : '')} />}
          {task.paziente_nome && <DR label="Paziente" value={task.paziente_nome} />}
          {task.servizio_nome && <DR label="Servizio" value={task.servizio_nome} />}
          {task.note && <DR label="Note" value={task.note} />}
          <div className="pt-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-2">Stato</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STATI.map(s => {
                const sc = STATO_CONFIG[s]; const isActive = task.stato === s
                return (
                  <button key={s} onClick={() => onCambiaStato(task.id, s)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${isActive ? '' : 'hover:opacity-80'}`}
                    style={{ background: sc.bg, color: sc.colore, boxShadow: isActive ? `0 0 0 2px ${sc.colore}` : 'none' }}>
                    {sc.icon} {s}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-white/5 space-y-1.5">
          {task.stato === 'Completato' && <button onClick={() => onArchivia(task.id)} className="w-full py-2 rounded-xl text-xs font-semibold text-dac-gray-400 bg-white/5 hover:bg-white/10 transition-colors">📦 Archivia</button>}
          <button onClick={elimina} className="w-full py-2 rounded-xl text-xs font-semibold text-dac-red bg-dac-red/10 hover:bg-dac-red/20 transition-colors">🗑️ Elimina</button>
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

// ═══════════════════════════════════════════════════════════
// NUOVO TASK
// ═══════════════════════════════════════════════════════════
function NuovoTaskModal({ operatori, operatoreCorrente, isAdmin, onClose, onSaved }: {
  operatori: { id: string; nome: string; emoji: string }[]; operatoreCorrente: Operatore; isAdmin: boolean
  onClose: () => void; onSaved: () => void
}) {
  const [desc, setDesc] = useState('')
  const [tipo, setTipo] = useState('🎯 Libero')
  const [priorita, setPriorita] = useState('Media')
  const [assegnatoA, setAssegnatoA] = useState(operatoreCorrente.nome)
  const [scadenza, setScadenza] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [ora, setOra] = useState('')
  const [paziente, setPaziente] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!desc.trim()) return
    setSaving(true)
    const codice = 'TSK-' + assegnatoA.replace(/[. ]/g, '').substring(0, 3).toUpperCase() + '-' + format(new Date(), 'yyMMddHHmmss')
    const op = operatori.find(o => o.nome === assegnatoA)
    await supabase.from('task').insert({
      codice, tipo, descrizione: desc.trim(), priorita, stato: 'Da fare',
      assegnato_a: op?.id ?? null, assegnato_a_nome: assegnatoA, assegnato_da: operatoreCorrente.nome,
      scadenza: scadenza || null, ora: ora ? ora + ':00' : null,
      paziente_nome: paziente || null, servizio_nome: null, note: note || null,
    })
    setSaving(false); onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-display font-bold text-white">➕ Nuovo Task</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Descrizione *</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} className="input-field" placeholder="Cosa deve essere fatto?" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="input-field">{TIPI.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Priorità</label>
              <select value={priorita} onChange={e => setPriorita(e.target.value)} className="input-field">{PRIORITA.map(p => <option key={p} value={p}>{PRIO_CONFIG[p].label} {p}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Assegnato a</label>
              {isAdmin
                ? <select value={assegnatoA} onChange={e => setAssegnatoA(e.target.value)} className="input-field">{operatori.map(o => <option key={o.id} value={o.nome}>{o.emoji} {o.nome}</option>)}</select>
                : <div className="input-field bg-white/3 text-dac-gray-400">{operatoreCorrente.emoji} {operatoreCorrente.nome}</div>
              }
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Scadenza</label>
              <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Ora</label>
              <input type="time" value={ora} onChange={e => setOra(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Paziente</label>
              <input type="text" value={paziente} onChange={e => setPaziente(e.target.value)} className="input-field" placeholder="Nome paziente" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field resize-none" rows={2} placeholder="Note..." />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">Annulla</button>
          <button onClick={salva} disabled={saving || !desc.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-green text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Crea Task</>}
          </button>
        </div>
      </div>
    </div>
  )
}
