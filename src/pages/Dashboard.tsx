import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import {
  DollarSign, Calendar, AlertTriangle, Users, CheckCircle,
  Stethoscope, TrendingUp, Clock, Package, FlaskConical
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  operatore: Operatore
}

interface DashboardData {
  fatturatoMese: number
  appuntamentiOggi: number
  taskScaduti: number
  pazientiNuoviMese: number
  tassoCompletamento: number
  inventarioCritico: number
  loading: boolean
}

export function Dashboard({ operatore }: Props) {
  const [data, setData] = useState<DashboardData>({
    fatturatoMese: 0,
    appuntamentiOggi: 0,
    taskScaduti: 0,
    pazientiNuoviMese: 0,
    tassoCompletamento: 0,
    inventarioCritico: 0,
    loading: true,
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const oggi = new Date()
    const inizioMese = format(new Date(oggi.getFullYear(), oggi.getMonth(), 1), 'yyyy-MM-dd')
    const oggiStr = format(oggi, 'yyyy-MM-dd')

    const [ricavi, appuntamenti, taskScaduti, pazientiNuovi, taskTutti, invCritico] = await Promise.all([
      supabase.from('ricavi').select('importo').gte('data', inizioMese),
      supabase.from('appuntamenti').select('id').eq('data', oggiStr),
      supabase.from('task').select('id').in('stato', ['Da fare', 'In corso', 'In attesa']).lt('scadenza', oggiStr),
      supabase.from('pazienti').select('id').gte('created_at', inizioMese),
      supabase.from('task').select('stato').gte('created_at', inizioMese),
      supabase.from('inventario').select('id').neq('stato', '✅ OK'),
    ])

    const fatturato = ricavi.data?.reduce((sum, r) => sum + Number(r.importo), 0) ?? 0
    const completati = taskTutti.data?.filter(t => t.stato === 'Completato').length ?? 0
    const totTask = taskTutti.data?.length ?? 0

    setData({
      fatturatoMese: fatturato,
      appuntamentiOggi: appuntamenti.data?.length ?? 0,
      taskScaduti: taskScaduti.data?.length ?? 0,
      pazientiNuoviMese: pazientiNuovi.data?.length ?? 0,
      tassoCompletamento: totTask > 0 ? Math.round((completati / totTask) * 100) : 0,
      inventarioCritico: invCritico.data?.length ?? 0,
      loading: false,
    })
  }

  const kpis = [
    {
      label: 'Fatturato Mese',
      value: `€${data.fatturatoMese.toLocaleString('it-IT')}`,
      icon: DollarSign,
      color: '#2e86c1',
      bg: 'rgba(46, 134, 193, 0.08)',
    },
    {
      label: 'Appuntamenti Oggi',
      value: data.appuntamentiOggi,
      icon: Calendar,
      color: '#1abc9c',
      bg: 'rgba(26, 188, 156, 0.08)',
    },
    {
      label: 'Task Scaduti',
      value: data.taskScaduti,
      icon: AlertTriangle,
      color: data.taskScaduti > 0 ? '#e74c3c' : '#27ae60',
      bg: data.taskScaduti > 0 ? 'rgba(231, 76, 60, 0.08)' : 'rgba(39, 174, 96, 0.08)',
    },
    {
      label: 'Pazienti Nuovi',
      value: data.pazientiNuoviMese,
      icon: Users,
      color: '#8e44ad',
      bg: 'rgba(142, 68, 173, 0.08)',
    },
    {
      label: 'Completamento',
      value: `${data.tassoCompletamento}%`,
      icon: CheckCircle,
      color: '#27ae60',
      bg: 'rgba(39, 174, 96, 0.08)',
    },
    {
      label: 'Inventario Critico',
      value: data.inventarioCritico,
      icon: FlaskConical,
      color: data.inventarioCritico > 0 ? '#f39c12' : '#27ae60',
      bg: data.inventarioCritico > 0 ? 'rgba(243, 156, 18, 0.08)' : 'rgba(39, 174, 96, 0.08)',
    },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-white">
              Buongiorno, {operatore.nome} {operatore.emoji || '👤'}
            </h1>
            <p className="text-dac-gray-400 text-sm mt-0.5">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: it })} — Palazzo della Salute
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="px-3 py-1.5 rounded-lg text-xs font-medium
              bg-dac-accent/10 text-dac-accent hover:bg-dac-accent/20 transition-colors"
          >
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="kpi-glow rounded-xl border border-white/5 p-4 transition-all duration-200 hover:border-white/10 animate-slide-up"
              style={{
                background: kpi.bg,
                animationDelay: `${i * 80}ms`,
                animationFillMode: 'both',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg" style={{ background: `${kpi.color}15` }}>
                  <Icon size={14} style={{ color: kpi.color }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400">
                  {kpi.label}
                </span>
              </div>
              <div className="text-xl lg:text-2xl font-display font-bold text-white">
                {data.loading ? (
                  <div className="h-7 w-16 bg-white/5 rounded animate-pulse" />
                ) : (
                  kpi.value
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Appuntamenti oggi */}
        <div className="rounded-xl border border-white/5 bg-dac-card/50 p-5 animate-slide-up"
          style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <h3 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-dac-teal" />
            Appuntamenti di Oggi
          </h3>
          <AppuntamentiOggi />
        </div>

        {/* Task in scadenza */}
        <div className="rounded-xl border border-white/5 bg-dac-card/50 p-5 animate-slide-up"
          style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <h3 className="font-display font-bold text-sm text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-dac-orange" />
            Task in Scadenza
          </h3>
          <TaskScadenza />
        </div>
      </div>
    </div>
  )
}

function AppuntamentiOggi() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('appuntamenti')
      .select('*')
      .eq('data', format(new Date(), 'yyyy-MM-dd'))
      .order('ora')
      .then(({ data }) => {
        setApps(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSkeleton rows={4} />

  if (apps.length === 0) {
    return (
      <div className="text-center py-8 text-dac-gray-500 text-sm">
        <Calendar size={24} className="mx-auto mb-2 opacity-30" />
        Nessun appuntamento oggi
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {apps.map(app => (
        <div key={app.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
          <div className="text-xs font-mono font-bold text-dac-accent w-12 flex-shrink-0">
            {app.ora?.substring(0, 5)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{app.paziente_nome}</div>
            <div className="text-[11px] text-dac-gray-400 truncate">{app.servizio_nome} — {app.operatore_nome}</div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold stato-${app.stato?.toLowerCase().replace(/[\s-]/g, '')}`}>
            {app.stato}
          </span>
        </div>
      ))}
    </div>
  )
}

function TaskScadenza() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('task')
      .select('*')
      .in('stato', ['Da fare', 'In corso', 'In attesa'])
      .not('scadenza', 'is', null)
      .order('scadenza')
      .limit(10)
      .then(({ data }) => {
        setTasks(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSkeleton rows={4} />

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-dac-gray-500 text-sm">
        <CheckCircle size={24} className="mx-auto mb-2 opacity-30" />
        Nessun task in scadenza
      </div>
    )
  }

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {tasks.map(task => {
        const scadenza = task.scadenza ? new Date(task.scadenza) : null
        const isScaduto = scadenza && scadenza < oggi

        return (
          <div key={task.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors
              ${isScaduto ? 'bg-dac-red/5 border border-dac-red/10' : 'bg-white/3 hover:bg-white/5'}`}
          >
            <div className={`w-1 h-8 rounded-full flex-shrink-0
              ${task.priorita === 'Urgente' ? 'bg-dac-red' :
                task.priorita === 'Alta' ? 'bg-dac-orange' :
                task.priorita === 'Media' ? 'bg-dac-blue' : 'bg-dac-gray-400'}`}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{task.descrizione}</div>
              <div className="text-[11px] text-dac-gray-400 truncate">
                {task.assegnato_a_nome} — {task.scadenza ? format(new Date(task.scadenza), 'dd/MM') : ''}
              </div>
            </div>
            {isScaduto && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dac-red/15 text-dac-red">
                SCADUTO
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-white/3 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  )
}
