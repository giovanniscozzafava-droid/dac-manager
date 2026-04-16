import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeightRule } from 'docx'
import { format } from 'date-fns'

interface AnamnesiData {
  codice: string
  paziente_nome: string
  specialista: string | null
  motivo_visita: string | null
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
  note_infermiera: string | null
  created_at: string
}

interface PazienteData {
  cognome: string
  nome: string
  codice_fiscale: string | null
  data_nascita: string | null
  sesso: string | null
  telefono: string | null
  email: string | null
}

// Helper per creare celle tabella
function cell(text: string, opts: { bold?: boolean; width?: number; shading?: string; align?: any } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { fill: opts.shading } : undefined,
    children: [new Paragraph({
      alignment: opts.align,
      children: [new TextRun({ text: text || '', bold: opts.bold, size: 20 })]
    })]
  })
}

function emptyCell(width?: number, shading?: string) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: shading ? { fill: shading } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })]
  })
}

function calcolaRischio(a: AnamnesiData): { livello: string; colore: string; motivo: string } {
  const fattori: string[] = []
  if (a.patologie) {
    const p = a.patologie.toLowerCase()
    if (p.includes('cardio') || p.includes('infarto') || p.includes('ictus')) fattori.push('Cardiopatia')
    if (p.includes('iperten')) fattori.push('Ipertensione')
    if (p.includes('diabet')) fattori.push('Diabete')
    if (p.includes('tumor') || p.includes('cancro')) fattori.push('Oncologico')
    if (p.includes('renal') || p.includes('epat')) fattori.push('Organi interni')
  }
  if (a.pacemaker === 'Si') fattori.push('Pacemaker')
  if (a.gravidanza === 'Si') fattori.push('Gravidanza')
  if (a.prob_circolatori === 'Si') fattori.push('Prob. circolatori')

  if (fattori.length >= 3) return { livello: 'MOLTO ALTO', colore: 'C00000', motivo: fattori.join(', ') }
  if (fattori.length >= 2) return { livello: 'ALTO', colore: 'ED7D31', motivo: fattori.join(', ') }
  if (fattori.length === 1) return { livello: 'MEDIO', colore: 'FFC000', motivo: fattori[0] }
  return { livello: 'BASSO', colore: '70AD47', motivo: 'Nessun fattore significativo' }
}

function recallConsigliato(rischio: string): number {
  if (rischio === 'MOLTO ALTO') return 30
  if (rischio === 'ALTO') return 60
  if (rischio === 'MEDIO') return 90
  return 180
}

export async function generaAnamnesiDOCX(a: AnamnesiData, p: PazienteData | null): Promise<{ blob: Blob; base64: string; filename: string }> {
  const dataVisita = format(new Date(a.created_at), 'dd/MM/yyyy')
  const rischio = calcolaRischio(a)
  const recall = recallConsigliato(rischio.livello)

  // Intestazione struttura
  const header = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Palazzo della Salute', bold: true, size: 32, color: '1F4E79' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'LABORATORI DAC S.R.L. SOCIETÀ BENEFIT — P.IVA / C.F. 01233930864', bold: true, size: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Via Stazione 20, 94010 Catenanuova (EN) — Tel. +39 0935 950025', bold: true, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SCHEDA ANAMNESI PRE-VISITA', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: `Data: ${dataVisita}  —  Specialista: ${a.specialista ?? '[da definire]'}`, bold: true, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
  ]

  // Dati Paziente
  const datiPaziente = new Paragraph({ children: [new TextRun({ text: 'DATI PAZIENTE', bold: true, size: 24, color: '1F4E79' })] })

  const tabDati = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Paziente', { bold: true, width: 30, shading: 'E7F0F9' }), cell(a.paziente_nome, { bold: true, width: 70 })] }),
      new TableRow({ children: [cell('Data nascita', { bold: true, shading: 'E7F0F9' }), cell(p?.data_nascita ? `${format(new Date(p.data_nascita), 'dd/MM/yyyy')}  —  Sesso: ${p?.sesso ?? '-'}` : '-', { bold: true })] }),
      new TableRow({ children: [cell('Codice Fiscale', { bold: true, shading: 'E7F0F9' }), cell(p?.codice_fiscale ?? '-', { bold: true })] }),
      new TableRow({ children: [cell('Telefono', { bold: true, shading: 'E7F0F9' }), cell(p?.telefono ?? '-', { bold: true })] }),
      new TableRow({ children: [cell('Email', { bold: true, shading: 'E7F0F9' }), cell(p?.email ?? '', { bold: true })] }),
    ]
  })

  // Motivo visita
  const motivoSection = [
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: `MOTIVO VISITA: ${a.motivo_visita ?? '.'}`, bold: true, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
  ]

  // Parametri vitali
  const parametriTitle = new Paragraph({ children: [new TextRun({ text: 'PARAMETRI VITALI', bold: true, size: 24, color: '1F4E79' })] })
  const paramRows: TableRow[] = []
  if (a.peso) paramRows.push(new TableRow({ children: [cell('Peso', { bold: true, width: 30, shading: 'E7F0F9' }), cell(`${a.peso} kg`, { bold: true })] }))
  if (a.altezza) paramRows.push(new TableRow({ children: [cell('Altezza', { bold: true, shading: 'E7F0F9' }), cell(`${a.altezza} cm`, { bold: true })] }))
  if (a.pressione_arteriosa) paramRows.push(new TableRow({ children: [cell('Pressione arteriosa', { bold: true, shading: 'E7F0F9' }), cell(`${a.pressione_arteriosa} mmHg`, { bold: true })] }))
  if (a.frequenza_cardiaca) paramRows.push(new TableRow({ children: [cell('Frequenza cardiaca', { bold: true, shading: 'E7F0F9' }), cell(`${a.frequenza_cardiaca} bpm`, { bold: true })] }))
  if (a.glicemia) paramRows.push(new TableRow({ children: [cell('Glicemia', { bold: true, shading: 'E7F0F9' }), cell(`${a.glicemia} mg/dL`, { bold: true })] }))
  if (paramRows.length === 0) paramRows.push(new TableRow({ children: [cell('—', { width: 30, shading: 'E7F0F9' }), cell('—')] }))
  const tabParametri = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: paramRows })

  // Anamnesi patologica
  const anamnesiTitle = new Paragraph({ children: [new TextRun({ text: 'ANAMNESI PATOLOGICA', bold: true, size: 24, color: '1F4E79' })] })
  const tabAnamnesi = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Patologie', { bold: true, width: 30, shading: 'E7F0F9' }), cell(a.patologie || 'Nessuna riferita', { bold: true })] }),
      new TableRow({ children: [cell('Interventi pregressi', { bold: true, shading: 'E7F0F9' }), cell(a.interventi_pregressi || 'Nessuno', { bold: true })] }),
    ]
  })

  // Allergie
  const allergieSection = [
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: `⚠ ALLERGIE: ${a.allergie || 'Nessuna riferita'}`, bold: true, size: 22, color: a.allergie ? 'C00000' : '000000' })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
  ]

  // Farmaci
  const farmaciTitle = new Paragraph({ children: [new TextRun({ text: 'FARMACI IN USO', bold: true, size: 24, color: '1F4E79' })] })
  const farmaciContent = new Paragraph({ children: [new TextRun({ text: a.farmaci || 'Nessun farmaco riferito', size: 22 })] })

  // Condizioni specifiche
  const condizioniTitle = new Paragraph({ children: [new TextRun({ text: 'CONDIZIONI SPECIFICHE', bold: true, size: 24, color: '1F4E79' })] })
  const tabCondizioni = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        cell('Gravidanza', { bold: true, width: 25, shading: 'E7F0F9' }),
        cell(a.gravidanza ?? 'No', { bold: true, width: 25 }),
        cell('Pacemaker', { bold: true, width: 25, shading: 'E7F0F9' }),
        cell(a.pacemaker ?? 'No', { bold: true, width: 25 }),
      ]}),
      new TableRow({ children: [
        cell('Prob. circolatori', { bold: true, shading: 'E7F0F9' }),
        cell(a.prob_circolatori ?? 'No', { bold: true }),
        cell('Fototipo', { bold: true, shading: 'E7F0F9' }),
        cell(a.fototipo || 'N/A', { bold: true }),
      ]}),
      new TableRow({ children: [
        cell('Fumo', { bold: true, shading: 'E7F0F9' }),
        cell(a.fumo ?? '-', { bold: true }),
        cell('Alcol', { bold: true, shading: 'E7F0F9' }),
        cell(a.alcol ?? '-', { bold: true }),
      ]}),
      new TableRow({ children: [
        cell('Attività fisica', { bold: true, shading: 'E7F0F9' }),
        cell(a.attivita_fisica ?? '-', { bold: true }),
        emptyCell(25, 'E7F0F9'),
        emptyCell(25),
      ]}),
    ]
  })

  // SEZIONE MEDICO — da compilare
  const sezioneMedico = [
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'SEZIONE RISERVATA AL MEDICO', bold: true, size: 26, color: 'C00000' })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'ESAME OBIETTIVO', bold: true, size: 24, color: '1F4E79' })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'DIAGNOSI', bold: true, size: 24, color: '1F4E79' })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'TERAPIA PRESCRITTA', bold: true, size: 24, color: '1F4E79' })] }),
  ]

  // Tabella terapia vuota
  const tabTerapia = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        cell('Farmaco / Trattamento', { bold: true, shading: 'E7F0F9', width: 40 }),
        cell('Dosaggio', { bold: true, shading: 'E7F0F9', width: 20 }),
        cell('Frequenza', { bold: true, shading: 'E7F0F9', width: 20 }),
        cell('Durata', { bold: true, shading: 'E7F0F9', width: 20 }),
      ]}),
      new TableRow({ height: { value: 400, rule: HeightRule.ATLEAST }, children: [emptyCell(40), emptyCell(20), emptyCell(20), emptyCell(20)] }),
      new TableRow({ height: { value: 400, rule: HeightRule.ATLEAST }, children: [emptyCell(40), emptyCell(20), emptyCell(20), emptyCell(20)] }),
      new TableRow({ height: { value: 400, rule: HeightRule.ATLEAST }, children: [emptyCell(40), emptyCell(20), emptyCell(20), emptyCell(20)] }),
      new TableRow({ height: { value: 400, rule: HeightRule.ATLEAST }, children: [emptyCell(40), emptyCell(20), emptyCell(20), emptyCell(20)] }),
    ]
  })

  // Esami + controllo
  const esamiControllo = [
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'ESAMI RICHIESTI', bold: true, size: 24, color: '1F4E79' })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(120), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'PROSSIMO CONTROLLO', bold: true, size: 24, color: '1F4E79' })] }),
  ]

  const tabControllo = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Data consigliata', { bold: true, width: 30, shading: 'E7F0F9' }), cell('___  /  ___  /  ________', { bold: true })] }),
      new TableRow({ children: [cell('Urgenza', { bold: true, shading: 'E7F0F9' }), cell('☐ Routine   ☐ Urgente   ☐ Follow-up stretto', { bold: true })] }),
      new TableRow({ children: [cell('Note', { bold: true, shading: 'E7F0F9' }), emptyCell(70)] }),
    ]
  })

  // Classificazione rischio
  const rischioTitle = [
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'CLASSIFICAZIONE RISCHIO PAZIENTE', bold: true, size: 24, color: '1F4E79' })] }),
  ]

  const tabRischio = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Rischio calcolato (auto)', { bold: true, width: 35, shading: 'E7F0F9' }), cell(`${rischio.livello} — ${rischio.motivo}`, { bold: true })] }),
      new TableRow({ children: [cell('Rischio confermato dal medico', { bold: true, shading: 'E7F0F9' }), cell('☐ BASSO   ☐ MEDIO   ☐ ALTO   ☐ MOLTO ALTO', { bold: true })] }),
      new TableRow({ children: [cell('Recall consigliato (gg)', { bold: true, shading: 'E7F0F9' }), cell(String(recall), { bold: true })] }),
      new TableRow({ children: [cell('Note rischio', { bold: true, shading: 'E7F0F9' }), emptyCell(65)] }),
    ]
  })

  // Firma
  const firma = [
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: 'Firma Specialista: ________________________________          Data: ___  /  ___  /  ________', size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Documento generato da DAC Manager — Palazzo della Salute — LABORATORI DAC S.R.L. SOCIETÀ BENEFIT', italics: true, size: 16, color: '808080' })] }),
  ]

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        ...header,
        datiPaziente,
        tabDati,
        ...motivoSection,
        parametriTitle,
        tabParametri,
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        anamnesiTitle,
        tabAnamnesi,
        ...allergieSection,
        farmaciTitle,
        farmaciContent,
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        condizioniTitle,
        tabCondizioni,
        ...sezioneMedico,
        tabTerapia,
        ...esamiControllo,
        tabControllo,
        ...rischioTitle,
        tabRischio,
        ...firma,
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)

  // Converti blob in base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const nomeSafe = a.paziente_nome.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
  const filename = `Anamnesi_${nomeSafe}_${format(new Date(a.created_at), 'dd-MM-yyyy')}.docx`

  return { blob, base64, filename }
}
