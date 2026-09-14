/**
 * Export report per amministrazione / contabilità / integrazione gestionali esterni.
 * CSV (Excel-friendly, separatore `;`, BOM UTF-8) e PDF riepilogo.
 */
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export function euro(n: number): string {
  return Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function escCsv(v: unknown): string {
  const s = String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')
  return `"${s}"`
}

/** Scarica un CSV con BOM UTF-8 (apre correttamente in Excel IT). */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [
    headers.map(escCsv).join(';'),
    ...rows.map(r => r.map(escCsv).join(';')),
  ]
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface AccountingSnapshot {
  periodoLabel: string
  inizio: string
  fine: string
  operatoreNome: string
  totRicavi: number
  totCosti: number
  margine: number
  nTransazioni: number
  perReparto: { name: string; value: number }[]
  costiPerCat: { name: string; value: number }[]
  perMetodo: { name: string; value: number }[]
  trend: { mese: string; ricavi: number; costi: number; margine: number }[]
  ricavi: Array<{
    data: string
    codice?: string | null
    paziente_nome?: string | null
    servizio_nome?: string | null
    reparto?: string | null
    operatore_nome?: string | null
    importo: number
    metodo?: string | null
    note?: string | null
  }>
  costi: Array<{
    data: string
    codice?: string | null
    categoria?: string | null
    descrizione?: string | null
    fornitore?: string | null
    importo: number
    metodo?: string | null
    note?: string | null
  }>
}

export function exportRicaviCsv(rows: AccountingSnapshot['ricavi'], periodoSlug: string): void {
  downloadCsv(
    `dac_ricavi_${periodoSlug}.csv`,
    ['Data', 'Codice', 'Paziente', 'Servizio', 'Reparto', 'Operatore', 'Importo', 'Metodo', 'Source', 'InvoiceStatus', 'Note'],
    rows.map(r => [
      r.data,
      r.codice ?? '',
      r.paziente_nome ?? '',
      r.servizio_nome ?? '',
      r.reparto ?? '',
      r.operatore_nome ?? '',
      euro(r.importo),
      r.metodo ?? '',
      (r as any).source_system ?? '',
      (r as any).invoice_status ?? '',
      r.note ?? '',
    ])
  )
}

export function exportCostiCsv(rows: AccountingSnapshot['costi'], periodoSlug: string): void {
  downloadCsv(
    `dac_costi_${periodoSlug}.csv`,
    ['Data', 'Codice', 'Categoria', 'Descrizione', 'Fornitore', 'Importo', 'Metodo', 'Note'],
    rows.map(c => [
      c.data,
      c.codice ?? '',
      c.categoria ?? '',
      c.descrizione ?? '',
      c.fornitore ?? '',
      euro(c.importo),
      c.metodo ?? '',
      c.note ?? '',
    ])
  )
}

export function exportRiepilogoCsv(s: AccountingSnapshot, periodoSlug: string): void {
  const rows: unknown[][] = [
    ['Periodo', s.periodoLabel],
    ['Dal', s.inizio],
    ['Al', s.fine],
    ['Generato da', s.operatoreNome],
    ['Generato il', format(new Date(), 'dd/MM/yyyy HH:mm')],
    [],
    ['KPI', 'Valore'],
    ['Totale ricavi', euro(s.totRicavi)],
    ['Totale costi', euro(s.totCosti)],
    ['Margine operativo', euro(s.margine)],
    ['Margine %', s.totRicavi > 0 ? `${((s.margine / s.totRicavi) * 100).toFixed(1)}%` : '—'],
    ['N. transazioni ricavi', s.nTransazioni],
    [],
    ['Reparto', 'Ricavi €'],
    ...s.perReparto.map(r => [r.name, euro(r.value)]),
    [],
    ['Categoria costo', 'Importo €'],
    ...s.costiPerCat.map(c => [c.name, euro(c.value)]),
    [],
    ['Metodo pagamento', 'Incassi €'],
    ...s.perMetodo.map(m => [m.name, euro(m.value)]),
  ]
  downloadCsv(`dac_riepilogo_${periodoSlug}.csv`, ['Campo', 'Valore'], rows)
}

/** Costruisce il PDF (Blob) — usato da export e da test. */
export function buildAccountingPdfBlob(s: AccountingSnapshot): Blob {
  const doc = new jsPDF()
  const L = 18
  const R = 192
  let y = 18

  const check = (need = 12) => {
    if (y + need > 280) {
      doc.addPage()
      y = 18
    }
  }

  const line = (text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    check(opts?.size ? opts.size + 4 : 8)
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
    doc.setFontSize(opts?.size ?? 10)
    if (opts?.color) doc.setTextColor(...opts.color)
    else doc.setTextColor(30, 40, 55)
    doc.text(text, L, y)
    y += (opts?.size ?? 10) * 0.45 + 4
  }

  const kv = (label: string, value: string, valueColor?: [number, number, number]) => {
    check(8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 110, 120)
    doc.text(label, L, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(valueColor ?? [30, 40, 55]))
    doc.text(value, R, y, { align: 'right' })
    y += 7
  }

  doc.setFillColor(26, 58, 92)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Palazzo della Salute — Report Contabile', L, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Periodo: ${s.periodoLabel}  ·  ${s.inizio} → ${s.fine}`, L, 20)
  y = 38

  line('Riepilogo KPI', { bold: true, size: 12, color: [26, 58, 92] })
  kv('Totale ricavi', `€ ${euro(s.totRicavi)}`, [39, 174, 96])
  kv('Totale costi', `€ ${euro(s.totCosti)}`, [231, 76, 60])
  kv('Margine operativo', `€ ${euro(s.margine)}`, s.margine >= 0 ? [46, 134, 193] : [231, 76, 60])
  kv(
    'Margine %',
    s.totRicavi > 0 ? `${((s.margine / s.totRicavi) * 100).toFixed(1)}%` : '—'
  )
  kv('Transazioni ricavi', String(s.nTransazioni))

  y += 4
  line('Ricavi per reparto', { bold: true, size: 12, color: [26, 58, 92] })
  if (s.perReparto.length === 0) {
    line('Nessun ricavo nel periodo', { size: 9, color: [140, 140, 140] })
  } else {
    for (const r of s.perReparto) {
      const pct = s.totRicavi > 0 ? ((r.value / s.totRicavi) * 100).toFixed(1) : '0'
      kv(r.name, `€ ${euro(r.value)}  (${pct}%)`)
    }
  }

  y += 4
  line('Costi per categoria', { bold: true, size: 12, color: [26, 58, 92] })
  if (s.costiPerCat.length === 0) {
    line('Nessun costo nel periodo', { size: 9, color: [140, 140, 140] })
  } else {
    for (const c of s.costiPerCat) kv(c.name, `€ ${euro(c.value)}`)
  }

  y += 4
  line('Incassi per metodo di pagamento', { bold: true, size: 12, color: [26, 58, 92] })
  if (s.perMetodo.length === 0) {
    line('Nessun dato', { size: 9, color: [140, 140, 140] })
  } else {
    for (const m of s.perMetodo) kv(m.name, `€ ${euro(m.value)}`)
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140, 140, 140)
    doc.text(
      `Generato da ${s.operatoreNome} il ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })} — DAC Manager — pag. ${i}/${pages}`,
      L,
      290
    )
  }

  return doc.output('blob')
}

/** PDF riepilogo contabile per consegna ad amministrazione. */
export function exportAccountingPdf(s: AccountingSnapshot, periodoSlug: string): void {
  const blob = buildAccountingPdfBlob(s)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dac_report_contabile_${periodoSlug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

/** CSV ricavi Laboratorio — bridge verso gestionale analisi cliniche. */
export function exportLaboratorioCsv(
  rows: AccountingSnapshot['ricavi'],
  periodoSlug: string
): void {
  const lab = rows.filter(r => (r.reparto || '').toLowerCase().includes('laboratorio'))
  downloadCsv(
    `dac_laboratorio_${periodoSlug}.csv`,
    ['Data', 'Codice', 'Paziente', 'Esame/Servizio', 'Operatore', 'Importo', 'Metodo', 'Note'],
    lab.map(r => [
      r.data,
      r.codice ?? '',
      r.paziente_nome ?? '',
      r.servizio_nome ?? '',
      r.operatore_nome ?? '',
      euro(r.importo),
      r.metodo ?? '',
      r.note ?? '',
    ])
  )
}

/** Snapshot helper: aggrega metodi da ricavi. */
export function aggregateMetodi(ricavi: AccountingSnapshot['ricavi']): { name: string; value: number }[] {
  const map: Record<string, number> = {}
  for (const r of ricavi) {
    const m = r.metodo || 'Non specificato'
    map[m] = (map[m] || 0) + Number(r.importo)
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}
