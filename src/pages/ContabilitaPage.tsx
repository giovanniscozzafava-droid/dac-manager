import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Operatore } from '@/hooks/useAuth'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, eachMonthOfInterval, subYears } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Wallet, Building2, Activity, Target, Download
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart as RPieChart, Pie, Cell,
  AreaChart, Area, Legend
} from 'recharts'

interface Props { operatore: Operatore }

const REPARTI = ['Laboratorio', 'Estetica', 'Med. Estetica', 'Med. Lavoro', 'Specialisti', 'Parafarmacia']
const REP_COLORS: Record<string, string> = {
  'Laboratorio': '#3498db', 'Estetica': '#8e44ad', 'Med. Estetica': '#2e86c1',
  'Med. Lavoro': '#27ae60', 'Specialisti': '#e74c3c', 'Parafarmacia': '#f39c12',
}
const CHART_THEME = {
  bg: 'transparent', grid: '#1c2844', text: '#7f8c8d', tooltip: '#0f1a2e',
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export function ContabilitaPage({ operatore }: Props) {
  const [tab, setTab] = useState<'overview' | 'pl' | 'reparti' | 'cashflow'>('overview')
  const [mese, setMese] = useState(startOfMonth(new Date()))
  const [ricavi, setRicavi] = useState<any[]>([])
  const [costi, setCosti] = useState<any[]>([])
  const [cassaPF, setCassaPF] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [annuale, setAnnuale] = useState(false)

  // Range: mese corrente o anno
  const inizio = annuale ? format(new Date(mese.getFullYear(), 0, 1), 'yyyy-MM-dd') : format(mese, 'yyyy-MM-dd')
  const fine = annuale ? format(new Date(mese.getFullYear(), 11, 31), 'yyyy-MM-dd') : format(endOfMonth(mese), 'yyyy-MM-dd')

  // Mese precedente per confronto
  const mesePrecInizio = format(subMonths(mese, 1), 'yyyy-MM-dd')
  const mesePrecFine = format(endOfMonth(subMonths(mese, 1)), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    // Carica 12 mesi di dati per trend
    const inizioAnno = format(subYears(endOfMonth(mese), 1), 'yyyy-MM-dd')
    const [r, c, pf] = await Promise.all([
      supabase.from('ricavi').select('*').gte('data', inizioAnno).lte('data', fine).order('data'),
      supabase.from('costi').select('*').gte('data', inizioAnno).lte('data', fine).order('data'),
      supabase.from('parafarmacia_cassa').select('*').gte('data', inizioAnno).lte('data', fine).order('data'),
    ])
    setRicavi(r.data ?? []); setCosti(c.data ?? []); setCassaPF(pf.data ?? [])
    setLoading(false)
  }, [fine, mese])

  useEffect(() => { load() }, [load])

  // Filtra periodo corrente
  const ricaviPeriodo = ricavi.filter(r => r.data >= inizio && r.data <= fine)
  const costiPeriodo = costi.filter(c => c.data >= inizio && c.data <= fine)
  const pfEntrate = cassaPF.filter(p => p.data >= inizio && p.data <= fine && p.tipo === 'Entrata')
  const pfUscite = cassaPF.filter(p => p.data >= inizio && p.data <= fine && p.tipo === 'Uscita')

  // Mese precedente
  const ricaviPrec = ricavi.filter(r => r.data >= mesePrecInizio && r.data <= mesePrecFine)
  const costiPrec = costi.filter(c => c.data >= mesePrecInizio && c.data <= mesePrecFine)

  // Totali
  const totRicavi = ricaviPeriodo.reduce((s, r) => s + Number(r.importo), 0)
  const totCosti = costiPeriodo.reduce((s, c) => s + Number(c.importo), 0)
  const margine = totRicavi - totCosti
  const marginePct = totRicavi > 0 ? (margine / totRicavi) * 100 : 0

  const totRicaviPrec = ricaviPrec.reduce((s, r) => s + Number(r.importo), 0)
  const totCostiPrec = costiPrec.reduce((s, c) => s + Number(c.importo), 0)
  const marginePrec = totRicaviPrec - totCostiPrec

  // Variazioni
  const varRicavi = totRicaviPrec > 0 ? ((totRicavi - totRicaviPrec) / totRicaviPrec) * 100 : 0
  const varCosti = totCostiPrec > 0 ? ((totCosti - totCostiPrec) / totCostiPrec) * 100 : 0
  const varMargine = marginePrec !== 0 ? ((margine - marginePrec) / Math.abs(marginePrec)) * 100 : 0

  // Trend mensile (ultimi 12 mesi)
  const trendData = useMemo(() => {
    const mesi = eachMonthOfInterval({ start: subYears(mese, 1), end: mese })
    return mesi.map(m => {
      const mi = format(m, 'yyyy-MM-dd')
      const mf = format(endOfMonth(m), 'yyyy-MM-dd')
      const ric = ricavi.filter(r => r.data >= mi && r.data <= mf).reduce((s, r) => s + Number(r.importo), 0)
      const cos = costi.filter(c => c.data >= mi && c.data <= mf).reduce((s, c) => s + Number(c.importo), 0)
      return { mese: format(m, 'MMM yy', { locale: it }), ricavi: ric, costi: cos, margine: ric - cos }
    })
  }, [ricavi, costi, cassaPF, mese])

  // Per reparto
  const perReparto = useMemo(() => {
    return REPARTI.map(rep => {
      const tot = ricaviPeriodo.filter(r => r.reparto === rep).reduce((s, r) => s + Number(r.importo), 0)
      return { name: rep, value: tot, color: REP_COLORS[rep] }
    }).filter(r => r.value > 0).sort((a, b) => b.value - a.value)
  }, [ricaviPeriodo])

  // Costi per categoria
  const costiPerCat = useMemo(() => {
    const cats: Record<string, number> = {}
    costiPeriodo.forEach(c => { cats[c.categoria] = (cats[c.categoria] || 0) + Number(c.importo) })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [costiPeriodo])

  const TABS = [
    { id: 'overview' as const, label: '📊 Overview', icon: BarChart3 },
    { id: 'pl' as const, label: '📈 Conto Economico', icon: TrendingUp },
    { id: 'reparti' as const, label: '🏥 Reparti', icon: Building2 },
    { id: 'cashflow' as const, label: '💸 Cash Flow', icon: Wallet },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-6 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-dac-accent" />
            <h1 className="font-display font-bold text-lg text-white">Contabilità</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle mensile/annuale */}
            <div className="flex rounded-lg bg-white/5 p-0.5">
              <button onClick={() => setAnnuale(false)} className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${!annuale ? 'bg-dac-accent text-white' : 'text-dac-gray-400'}`}>Mese</button>
              <button onClick={() => setAnnuale(true)} className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${annuale ? 'bg-dac-accent text-white' : 'text-dac-gray-400'}`}>Anno</button>
            </div>
            <button onClick={() => setMese(m => subMonths(m, annuale ? 12 : 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronLeft size={16} /></button>
            <span className="font-display font-bold text-white text-sm min-w-[120px] text-center">
              {annuale ? mese.getFullYear() : format(mese, 'MMMM yyyy', { locale: it })}
            </span>
            <button onClick={() => setMese(m => addMonths(m, annuale ? 12 : 1))} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5
                ${tab === t.id ? 'bg-dac-accent/15 text-dac-accent' : 'text-dac-gray-400 hover:text-white hover:bg-white/5'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {loading ? <LoadingGrid /> :
          tab === 'overview' ? <OverviewTab totRicavi={totRicavi} totCosti={totCosti} margine={margine} marginePct={marginePct} varRicavi={varRicavi} varCosti={varCosti} varMargine={varMargine} trendData={trendData} perReparto={perReparto} nTransazioni={ricaviPeriodo.length} />
          : tab === 'pl' ? <PLTab trendData={trendData} costiPerCat={costiPerCat} totRicavi={totRicavi} totCosti={totCosti} margine={margine} pfEntrate={pfEntrate.reduce((s, p) => s + Number(p.importo), 0)} pfUscite={pfUscite.reduce((s, p) => s + Number(p.importo), 0)} ricaviPeriodo={ricaviPeriodo} costiPeriodo={costiPeriodo} />
          : tab === 'reparti' ? <RepartiTab perReparto={perReparto} totRicavi={totRicavi} ricaviPeriodo={ricaviPeriodo} />
          : <CashFlowTab ricaviPeriodo={ricaviPeriodo} costiPeriodo={costiPeriodo} pfEntrate={pfEntrate} pfUscite={pfUscite} trendData={trendData} />
        }
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB OVERVIEW
// ═══════════════════════════════════════════════════════════
function OverviewTab({ totRicavi, totCosti, margine, marginePct, varRicavi, varCosti, varMargine, trendData, perReparto, nTransazioni }: any) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={TrendingUp} label="Ricavi" value={`€${totRicavi.toLocaleString('it-IT')}`} variazione={varRicavi} colore="#27ae60" />
        <KPICard icon={TrendingDown} label="Costi" value={`€${totCosti.toLocaleString('it-IT')}`} variazione={varCosti} colore="#e74c3c" inverso />
        <KPICard icon={DollarSign} label="Margine" value={`€${margine.toLocaleString('it-IT')}`} variazione={varMargine} colore={margine >= 0 ? '#2e86c1' : '#e74c3c'} />
        <KPICard icon={Target} label="Margine %" value={`${marginePct.toFixed(1)}%`} colore={marginePct >= 20 ? '#27ae60' : marginePct >= 10 ? '#f39c12' : '#e74c3c'} subtitle={`${nTransazioni} transazioni`} />
      </div>

      {/* Trend + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-dac-card/50 p-4">
          <h3 className="text-xs font-bold text-dac-gray-400 uppercase tracking-wider mb-4">📈 Trend Ricavi vs Costi (12 mesi)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gRic" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#27ae60" stopOpacity={0.3} /><stop offset="100%" stopColor="#27ae60" stopOpacity={0} /></linearGradient>
                <linearGradient id="gCos" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e74c3c" stopOpacity={0.2} /><stop offset="100%" stopColor="#e74c3c" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="mese" tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
              <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: CHART_THEME.tooltip, border: '1px solid #2e3a50', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#fff' }} formatter={(v: any) => `€${Number(v).toLocaleString('it-IT')}`} />
              <Area type="monotone" dataKey="ricavi" stroke="#27ae60" strokeWidth={2} fill="url(#gRic)" name="Ricavi" />
              <Area type="monotone" dataKey="costi" stroke="#e74c3c" strokeWidth={2} fill="url(#gCos)" name="Costi" />
              <Line type="monotone" dataKey="margine" stroke="#2e86c1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Margine" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-white/5 bg-dac-card/50 p-4">
          <h3 className="text-xs font-bold text-dac-gray-400 uppercase tracking-wider mb-4">🏥 Ricavi per Reparto</h3>
          {perReparto.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <RPieChart>
                  <Pie data={perReparto} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {perReparto.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: CHART_THEME.tooltip, border: '1px solid #2e3a50', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => `€${Number(v).toLocaleString('it-IT')}`} />
                </RPieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {perReparto.map((r: any) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: r.color }} /><span className="text-[10px] text-dac-gray-300">{r.name}</span></div>
                    <span className="text-[10px] font-bold text-white">€{r.value.toLocaleString('it-IT')}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="text-center py-10 text-dac-gray-500 text-xs">Nessun dato</div>}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB P&L (CONTO ECONOMICO)
// ═══════════════════════════════════════════════════════════
function PLTab({ trendData, costiPerCat, totRicavi, totCosti, margine, pfEntrate, pfUscite, ricaviPeriodo, costiPeriodo }: any) {
  // Ricavi per reparto
  const ricPerRep: Record<string, number> = {}
  ricaviPeriodo.forEach((r: any) => { const rep = r.reparto || 'Altro'; ricPerRep[rep] = (ricPerRep[rep] || 0) + Number(r.importo) })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-xl border border-white/5 bg-dac-card/50 overflow-hidden">
        <div className="px-5 py-3 bg-dac-accent/8 border-b border-white/5">
          <h3 className="font-display font-bold text-white text-sm">📈 Conto Economico</h3>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {/* RICAVI */}
          <PLSection title="RICAVI" color="#27ae60" bold>
            {Object.entries(ricPerRep).sort(([, a], [, b]) => (b as number) - (a as number)).map(([rep, val]) => (
              <PLRow key={rep} label={rep} value={val as number} />
            ))}
            {/* pfEntrate già nei ricavi via trigger */}
            <PLRow label="TOTALE RICAVI" value={totRicavi} bold color="#27ae60" />
          </PLSection>

          {/* COSTI */}
          <PLSection title="COSTI OPERATIVI" color="#e74c3c" bold>
            {costiPerCat.map((c: any) => <PLRow key={c.name} label={c.name} value={-c.value} />)}
            {/* pfUscite gestite separatamente */}
            <PLRow label="TOTALE COSTI" value={-totCosti} bold color="#e74c3c" />
          </PLSection>

          {/* MARGINE */}
          <div className={`px-5 py-4 ${margine >= 0 ? 'bg-dac-green/5' : 'bg-dac-red/5'}`}>
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-white text-sm">MARGINE OPERATIVO</span>
              <div className="text-right">
                <span className={`font-display font-bold text-xl ${margine >= 0 ? 'text-dac-green' : 'text-dac-red'}`}>
                  €{margine.toLocaleString('it-IT')}
                </span>
                <span className={`block text-[10px] ${margine >= 0 ? 'text-dac-green/60' : 'text-dac-red/60'}`}>
                  {totRicavi > 0 ? `${((margine / totRicavi) * 100).toFixed(1)}% dei ricavi` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend margine */}
      <div className="rounded-xl border border-white/5 bg-dac-card/50 p-4">
        <h3 className="text-xs font-bold text-dac-gray-400 uppercase tracking-wider mb-4">📊 Margine Mensile</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis dataKey="mese" tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
            <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: CHART_THEME.tooltip, border: '1px solid #2e3a50', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => `€${Number(v).toLocaleString('it-IT')}`} />
            <Bar dataKey="margine" radius={[4, 4, 0, 0]} name="Margine">
              {trendData.map((entry: any, i: number) => <Cell key={i} fill={entry.margine >= 0 ? '#27ae60' : '#e74c3c'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PLSection({ title, color, bold, children }: { title: string; color: string; bold?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-5 py-2 bg-white/[0.02]">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{title}</span>
      </div>
      <div className="px-5 divide-y divide-white/[0.02]">{children}</div>
    </div>
  )
}

function PLRow({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'pt-3 pb-3' : ''}`}>
      <span className={`text-xs ${bold ? 'font-bold text-white' : 'text-dac-gray-400'}`}>{label}</span>
      <span className={`text-xs font-mono ${bold ? 'font-bold text-sm' : ''}`} style={{ color: color || (value >= 0 ? '#e0e6ed' : '#e74c3c') }}>
        {value >= 0 ? '' : '-'}€{Math.abs(value).toLocaleString('it-IT')}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB REPARTI
// ═══════════════════════════════════════════════════════════
function RepartiTab({ perReparto, totRicavi, ricaviPeriodo }: any) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {perReparto.map((rep: any) => {
          const pct = totRicavi > 0 ? (rep.value / totRicavi) * 100 : 0
          const transazioni = ricaviPeriodo.filter((r: any) => r.reparto === rep.name).length
          const ticketMedio = transazioni > 0 ? rep.value / transazioni : 0
          return (
            <div key={rep.name} className="rounded-xl border border-white/5 bg-dac-card/50 p-4 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: rep.color }} />
                  <span className="text-sm font-bold text-white">{rep.name}</span>
                </div>
                <span className="text-lg font-display font-bold text-white">€{rep.value.toLocaleString('it-IT')}</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: rep.color }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xs font-bold text-white">{pct.toFixed(1)}%</div><div className="text-[8px] text-dac-gray-500">del totale</div></div>
                <div><div className="text-xs font-bold text-white">{transazioni}</div><div className="text-[8px] text-dac-gray-500">transazioni</div></div>
                <div><div className="text-xs font-bold text-white">€{ticketMedio.toFixed(0)}</div><div className="text-[8px] text-dac-gray-500">ticket medio</div></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bar chart comparativo */}
      <div className="rounded-xl border border-white/5 bg-dac-card/50 p-4">
        <h3 className="text-xs font-bold text-dac-gray-400 uppercase tracking-wider mb-4">📊 Confronto Reparti</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={perReparto} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis type="number" tick={{ fill: CHART_THEME.text, fontSize: 10 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fill: CHART_THEME.text, fontSize: 10 }} width={100} />
            <Tooltip contentStyle={{ background: CHART_THEME.tooltip, border: '1px solid #2e3a50', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => `€${Number(v).toLocaleString('it-IT')}`} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Ricavi">
              {perReparto.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB CASH FLOW
// ═══════════════════════════════════════════════════════════
function CashFlowTab({ ricaviPeriodo, costiPeriodo, pfEntrate, pfUscite, trendData }: any) {
  // Per metodo pagamento
  const perMetodo: Record<string, number> = {}
  ricaviPeriodo.forEach((r: any) => { const m = r.metodo || 'Non specificato'; perMetodo[m] = (perMetodo[m] || 0) + Number(r.importo) })

  const metodoData = Object.entries(perMetodo).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const METODO_COLORS = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#8e44ad', '#95a5a6']

  // Top servizi
  const perServizio: Record<string, { tot: number; count: number }> = {}
  ricaviPeriodo.forEach((r: any) => {
    if (!perServizio[r.servizio_nome]) perServizio[r.servizio_nome] = { tot: 0, count: 0 }
    perServizio[r.servizio_nome].tot += Number(r.importo)
    perServizio[r.servizio_nome].count++
  })
  const topServizi = Object.entries(perServizio).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.tot - a.tot).slice(0, 10)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per metodo */}
        <div className="rounded-xl border border-white/5 bg-dac-card/50 p-4">
          <h3 className="text-xs font-bold text-dac-gray-400 uppercase tracking-wider mb-4">💳 Incassi per Metodo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RPieChart>
              <Pie data={metodoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {metodoData.map((_, i) => <Cell key={i} fill={METODO_COLORS[i % METODO_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: CHART_THEME.tooltip, border: '1px solid #2e3a50', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => `€${Number(v).toLocaleString('it-IT')}`} />
            </RPieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {metodoData.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: METODO_COLORS[i % METODO_COLORS.length] }} /><span className="text-[10px] text-dac-gray-300">{m.name}</span></div>
                <span className="text-[10px] font-bold text-white">€{m.value.toLocaleString('it-IT')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top servizi */}
        <div className="rounded-xl border border-white/5 bg-dac-card/50 p-4">
          <h3 className="text-xs font-bold text-dac-gray-400 uppercase tracking-wider mb-4">🏆 Top Servizi per Fatturato</h3>
          <div className="space-y-2">
            {topServizi.map((s, i) => {
              const maxVal = topServizi[0]?.tot || 1
              const pct = (s.tot / maxVal) * 100
              return (
                <div key={s.nome}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-dac-gray-300 truncate max-w-[60%]">{i + 1}. {s.nome}</span>
                    <span className="text-[10px] font-bold text-white">€{s.tot.toLocaleString('it-IT')} <span className="text-dac-gray-500 font-normal">({s.count})</span></span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-dac-accent transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {topServizi.length === 0 && <div className="text-center py-8 text-dac-gray-500 text-xs">Nessun dato</div>}
          </div>
        </div>
      </div>

      {/* Cash flow mensile */}
      <div className="rounded-xl border border-white/5 bg-dac-card/50 p-4">
        <h3 className="text-xs font-bold text-dac-gray-400 uppercase tracking-wider mb-4">💸 Cash Flow Mensile</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis dataKey="mese" tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
            <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: CHART_THEME.tooltip, border: '1px solid #2e3a50', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => `€${Number(v).toLocaleString('it-IT')}`} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="ricavi" fill="#27ae60" name="Entrate" radius={[4, 4, 0, 0]} />
            <Bar dataKey="costi" fill="#e74c3c" name="Uscite" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// KPI CARD con animazione e variazione
// ═══════════════════════════════════════════════════════════
function KPICard({ icon: Icon, label, value, variazione, colore, inverso, subtitle }: {
  icon: any; label: string; value: string; variazione?: number; colore: string; inverso?: boolean; subtitle?: string
}) {
  const isPositivo = inverso ? (variazione ?? 0) <= 0 : (variazione ?? 0) >= 0

  return (
    <div className="rounded-xl border border-white/5 p-4 transition-all hover:border-white/10 hover:shadow-lg group"
      style={{ background: `${colore}08` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${colore}15` }}>
          <Icon size={14} style={{ color: colore }} />
        </div>
        {variazione !== undefined && variazione !== 0 && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isPositivo ? 'text-dac-green' : 'text-dac-red'}`}>
            {isPositivo ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(variazione).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-xl font-display font-bold text-white group-hover:scale-105 transition-transform origin-left">{value}</div>
      <div className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: `${colore}99` }}>{label}</div>
      {subtitle && <div className="text-[9px] text-dac-gray-500 mt-0.5">{subtitle}</div>}
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/3 animate-pulse" />)}</div>
      <div className="grid grid-cols-3 gap-3"><div className="col-span-2 h-64 rounded-xl bg-white/3 animate-pulse" /><div className="h-64 rounded-xl bg-white/3 animate-pulse" /></div>
    </div>
  )
}
