import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export interface AnamnesiPdfData {
  id: string
  codice: string
  paziente_nome: string
  specialista: string | null
  patologie: string | null
  allergie: string | null
  farmaci: string | null
  interventi_pregressi: string | null
  peso: number | null
  altezza: number | null
  pressione_arteriosa: string | null
  frequenza_cardiaca: number | null
  glicemia: number | null
  gravidanza: string | null
  pacemaker: string | null
  prob_circolatori: string | null
  fototipo: string | null
  fumo: string | null
  alcol: string | null
  attivita_fisica: string | null
  mansione: string | null
  rischio_lavorativo: string | null
  idoneita: string | null
  motivo_visita: string | null
  note_infermiera: string | null
  note_medico: string | null
  created_at: string
}

export interface PazientePdfData {
  cognome?: string | null
  nome?: string | null
  codice_fiscale?: string | null
  data_nascita?: string | null
  telefono?: string | null
  email?: string | null
  indirizzo?: string | null
}

export interface OperatorePdfData {
  nome?: string | null
  ruolo?: string | null
}

const ACCENT: [number, number, number] = [46, 134, 193]
const GRAY_DARK: [number, number, number] = [55, 65, 81]
const GRAY_MID: [number, number, number] = [120, 128, 138]
const GRAY_LINE: [number, number, number] = [225, 228, 232]

export function generateAnamnesiPDF(
  a: AnamnesiPdfData,
  paz: PazientePdfData | null,
  op: OperatorePdfData | null
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const M = 18
  let y = 0

  const createdLabel = format(new Date(a.created_at), 'dd MMMM yyyy — HH:mm', { locale: it })

  // ───── Header
  doc.setFillColor(...ACCENT)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('PALAZZO DELLA SALUTE', M, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('LABORATORI DAC S.R.L.', M, 17.5)
  doc.setFontSize(8)
  doc.text('Scheda Anamnestica Riservata', M, 22.5)
  doc.setFontSize(8)
  doc.text(`Cod. ${a.codice}`, pageW - M, 12, { align: 'right' })
  doc.text(createdLabel, pageW - M, 17.5, { align: 'right' })

  y = 36

  // ───── Titolo
  doc.setTextColor(...GRAY_DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('ANAMNESI CLINICA', M, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_MID)
  const destLabel = a.specialista ? `Destinatario: ${a.specialista}` : 'Destinatario: —'
  doc.text(destLabel, pageW - M, y, { align: 'right' })
  y += 4
  line(doc, M, y, pageW - M)
  y += 6

  // ───── Dati paziente
  y = section(doc, 'DATI PAZIENTE', M, y, pageW)
  const pazCognome = paz?.cognome ?? ''
  const pazNome = paz?.nome ?? ''
  const fullName = (pazCognome || pazNome) ? `${pazCognome} ${pazNome}`.trim() : a.paziente_nome
  const nascita = paz?.data_nascita ? format(new Date(paz.data_nascita), 'dd/MM/yyyy') : '—'
  y = kvGrid(doc, M, y, pageW, [
    ['Nome e Cognome', fullName],
    ['Codice Fiscale', paz?.codice_fiscale || '—'],
    ['Data di nascita', nascita],
    ['Telefono', paz?.telefono || '—'],
    ['Email', paz?.email || '—'],
    ['Indirizzo', paz?.indirizzo || '—'],
  ])
  y += 4

  // ───── Motivo visita
  if (a.motivo_visita) {
    y = section(doc, 'MOTIVO DELLA VISITA', M, y, pageW)
    y = paragraph(doc, a.motivo_visita, M, y, pageW - M * 2)
    y += 3
  }

  // ───── Parametri vitali
  const hasVit = a.peso || a.altezza || a.pressione_arteriosa || a.frequenza_cardiaca || a.glicemia
  if (hasVit) {
    y = section(doc, 'PARAMETRI VITALI', M, y, pageW)
    const rows: [string, string][] = []
    if (a.peso != null) rows.push(['Peso', `${a.peso} kg`])
    if (a.altezza != null) rows.push(['Altezza', `${a.altezza} cm`])
    if (a.peso && a.altezza) {
      const bmi = a.peso / Math.pow(a.altezza / 100, 2)
      rows.push(['BMI', bmi.toFixed(1)])
    }
    if (a.pressione_arteriosa) rows.push(['Pressione arteriosa', `${a.pressione_arteriosa} mmHg`])
    if (a.frequenza_cardiaca != null) rows.push(['Frequenza cardiaca', `${a.frequenza_cardiaca} bpm`])
    if (a.glicemia != null) rows.push(['Glicemia', `${a.glicemia} mg/dL`])
    y = kvGrid(doc, M, y, pageW, rows)
    y += 4
  }

  // ───── Anamnesi clinica
  const hasClin = a.patologie || a.allergie || a.farmaci || a.interventi_pregressi
  if (hasClin) {
    y = section(doc, 'ANAMNESI CLINICA', M, y, pageW)
    if (a.patologie) y = labeledBlock(doc, 'Patologie', a.patologie, M, y, pageW)
    if (a.allergie) y = labeledBlock(doc, 'Allergie', a.allergie, M, y, pageW)
    if (a.farmaci) y = labeledBlock(doc, 'Farmaci in uso', a.farmaci, M, y, pageW)
    if (a.interventi_pregressi) y = labeledBlock(doc, 'Interventi pregressi', a.interventi_pregressi, M, y, pageW)
    y += 3
  }

  // ───── Checklist
  y = ensurePage(doc, y, 50, M, pageW, pageH)
  y = section(doc, 'CHECKLIST & STILE DI VITA', M, y, pageW)
  y = kvGrid(doc, M, y, pageW, [
    ['Gravidanza', a.gravidanza ?? 'No'],
    ['Pacemaker', a.pacemaker ?? 'No'],
    ['Problemi circolatori', a.prob_circolatori ?? 'No'],
    ['Fototipo', a.fototipo || '—'],
    ['Fumo', a.fumo ?? '—'],
    ['Alcol', a.alcol ?? '—'],
    ['Attività fisica', a.attivita_fisica ?? '—'],
  ])
  y += 4

  // ───── Medicina del lavoro
  const hasLav = a.mansione || a.rischio_lavorativo || a.idoneita
  if (hasLav) {
    y = ensurePage(doc, y, 40, M, pageW, pageH)
    y = section(doc, 'MEDICINA DEL LAVORO', M, y, pageW)
    if (a.mansione) y = kvGrid(doc, M, y, pageW, [['Mansione', a.mansione]])
    if (a.rischio_lavorativo) y = labeledBlock(doc, 'Rischio lavorativo', a.rischio_lavorativo, M, y, pageW)
    if (a.idoneita) y = kvGrid(doc, M, y, pageW, [['Giudizio di idoneità', a.idoneita]])
    y += 3
  }

  // ───── Note
  if (a.note_infermiera) {
    y = ensurePage(doc, y, 30, M, pageW, pageH)
    y = section(doc, 'NOTE INFERMIERA', M, y, pageW)
    y = paragraph(doc, a.note_infermiera, M, y, pageW - M * 2)
    y += 3
  }
  if (a.note_medico) {
    y = ensurePage(doc, y, 30, M, pageW, pageH)
    y = section(doc, 'NOTE MEDICO', M, y, pageW)
    y = paragraph(doc, a.note_medico, M, y, pageW - M * 2)
    y += 3
  }

  // ───── Firma compilatore
  y = ensurePage(doc, y, 35, M, pageW, pageH)
  y += 4
  line(doc, M, y, pageW - M)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_MID)
  doc.text('Compilato da:', M, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_DARK)
  const opLabel = op?.nome ? `${op.nome}${op.ruolo ? ' — ' + op.ruolo : ''}` : '—'
  doc.text(opLabel, M + 28, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_MID)
  doc.text('Data:', pageW - M - 45, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_DARK)
  doc.text(createdLabel, pageW - M - 33, y)

  // ───── Footer su tutte le pagine
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(...GRAY_LINE)
    doc.setLineWidth(0.2)
    doc.line(M, pageH - 14, pageW - M, pageH - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY_MID)
    doc.text('Laboratori DAC S.r.l. — Palazzo della Salute', M, pageH - 9)
    doc.text('Documento riservato ad uso sanitario — GDPR/Reg. UE 2016/679', M, pageH - 5.5)
    doc.text(`Pagina ${p} di ${totalPages}`, pageW - M, pageH - 5.5, { align: 'right' })
  }

  return doc
}

// ───── helpers
function line(doc: jsPDF, x1: number, y: number, x2: number) {
  doc.setDrawColor(...GRAY_LINE)
  doc.setLineWidth(0.3)
  doc.line(x1, y, x2, y)
}

function section(doc: jsPDF, title: string, x: number, y: number, pageW: number): number {
  doc.setFillColor(244, 247, 251)
  doc.rect(x, y - 3, pageW - x * 2, 6.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...ACCENT)
  doc.text(title, x + 2, y + 1.2)
  return y + 8
}

function kvGrid(doc: jsPDF, x: number, y: number, pageW: number, rows: [string, string][]): number {
  const col = (pageW - x * 2) / 2
  let yy = y
  for (let i = 0; i < rows.length; i += 2) {
    drawKv(doc, rows[i][0], rows[i][1], x, yy, col - 4)
    if (rows[i + 1]) drawKv(doc, rows[i + 1][0], rows[i + 1][1], x + col, yy, col - 4)
    yy += 6
  }
  return yy
}

function drawKv(doc: jsPDF, k: string, v: string, x: number, y: number, w: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_MID)
  doc.text(k.toUpperCase(), x, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...GRAY_DARK)
  const lines = doc.splitTextToSize(v || '—', w)
  doc.text(lines[0] || '—', x, y + 4)
}

function labeledBlock(doc: jsPDF, label: string, text: string, x: number, y: number, pageW: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_MID)
  doc.text(label.toUpperCase(), x, y)
  y += 4
  y = paragraph(doc, text, x, y, pageW - x * 2)
  return y + 2
}

function paragraph(doc: jsPDF, text: string, x: number, y: number, w: number): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...GRAY_DARK)
  const lines = doc.splitTextToSize(text, w)
  doc.text(lines, x, y)
  return y + lines.length * 4.5
}

function ensurePage(doc: jsPDF, y: number, need: number, M: number, _pageW: number, pageH: number): number {
  if (y + need > pageH - 20) {
    doc.addPage()
    return M
  }
  return y
}

export function anamnesiPdfBlob(
  a: AnamnesiPdfData,
  paz: PazientePdfData | null,
  op: OperatorePdfData | null
): Blob {
  const doc = generateAnamnesiPDF(a, paz, op)
  return doc.output('blob')
}

export function anamnesiPdfFilename(a: AnamnesiPdfData, paz: PazientePdfData | null): string {
  const name = (paz?.cognome && paz?.nome) ? `${paz.cognome}_${paz.nome}` : a.paziente_nome.replace(/\s+/g, '_')
  const date = format(new Date(a.created_at), 'yyyyMMdd')
  const safe = name.normalize('NFD').replace(/[^\w]/g, '')
  return `anamnesi_${safe}_${date}_${a.codice}.pdf`
}
