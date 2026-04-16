import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, HeightRule
} from 'docx'
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

const BRAND_BLUE = '1F4E79'
const LIGHT_BLUE_BG = 'D5E8F5'
const LIGHT_GREY_BG = 'F2F2F2'
const RED_ALERT = 'C00000'
const PAGE_CW = 9356

const border = { style: BorderStyle.SINGLE, size: 6, color: 'A8A8A8' }
const bordersAll = { top: border, bottom: border, left: border, right: border }
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }
const cellMargin = { top: 120, bottom: 120, left: 160, right: 160 }

function tc(text: string, opts: any = {}) {
  return new TableCell({
    borders: bordersAll,
    margins: cellMargin,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: 'center' as any,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({
        text: text || '',
        bold: opts.bold,
        size: opts.size || 20,
        color: opts.color,
        font: 'Arial'
      })]
    })]
  })
}

function ec(width?: number, shading?: string) {
  return new TableCell({
    borders: bordersAll,
    margins: cellMargin,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: '', size: 20, font: 'Arial' })] })]
  })
}

function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND_BLUE, space: 4 } },
    children: [new TextRun({ text, bold: true, size: 24, color: BRAND_BLUE, font: 'Arial' })]
  })
}

function boxCompilabile(titolo: string, righe: number) {
  const rows = [new TableRow({ children: [tc(titolo, { bold: true, shading: BRAND_BLUE, color: 'FFFFFF', size: 18 })] })]
  for (let i = 0; i < righe; i++) {
    rows.push(new TableRow({ height: { value: 400, rule: HeightRule.EXACT }, children: [ec(PAGE_CW)] }))
  }
  return new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [PAGE_CW],
    rows
  })
}

function calcolaRischio(a: AnamnesiData): { livello: string; emoji: string; motivo: string; recall: number } {
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

  if (fattori.length >= 3) return { livello: 'MOLTO ALTO', emoji: '🔴', motivo: fattori.join(', '), recall: 30 }
  if (fattori.length >= 2) return { livello: 'ALTO', emoji: '🟠', motivo: fattori.join(', '), recall: 60 }
  if (fattori.length === 1) return { livello: 'MEDIO', emoji: '🟡', motivo: fattori[0], recall: 90 }
  return { livello: 'BASSO', emoji: '🟢', motivo: 'Nessun fattore significativo', recall: 180 }
}

function calcEta(dataNascita: string | null): string {
  if (!dataNascita) return '-'
  const n = new Date(dataNascita)
  const oggi = new Date()
  let eta = oggi.getFullYear() - n.getFullYear()
  const m = oggi.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && oggi.getDate() < n.getDate())) eta--
  return `${eta} anni`
}

function calcBMI(peso: number | null, altezza: number | null): string {
  if (!peso || !altezza) return '-'
  const bmi = peso / Math.pow(altezza / 100, 2)
  let stato = ''
  if (bmi < 18.5) stato = '(sottopeso)'
  else if (bmi < 25) stato = '(normopeso)'
  else if (bmi < 30) stato = '(sovrappeso)'
  else stato = '(obeso)'
  return `${bmi.toFixed(1)} ${stato}`
}

export async function generaAnamnesiDOCX(a: AnamnesiData, p: PazienteData | null): Promise<{ blob: Blob; base64: string; filename: string }> {
  const dataVisita = format(new Date(a.created_at), 'dd/MM/yyyy')
  const rischio = calcolaRischio(a)

  // HEADER
  const header = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'PALAZZO DELLA SALUTE', bold: true, size: 36, color: BRAND_BLUE, font: 'Arial' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: 'LABORATORI DAC S.R.L. SOCIETÀ BENEFIT', bold: true, size: 20, color: '595959', font: 'Arial' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [new TextRun({ text: 'P.IVA / C.F. 01233930864  •  Via Stazione 20, 94010 Catenanuova (EN)  •  Tel. +39 0935 950025', size: 18, color: '595959', font: 'Arial' })]
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: BRAND_BLUE, space: 8 } },
      spacing: { after: 280 },
      children: [new TextRun({ text: '', size: 2 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: 'SCHEDA ANAMNESI PRE-VISITA', bold: true, size: 32, color: BRAND_BLUE, font: 'Arial' })]
    }),
  ]

  const tabVisita = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [3119, 3119, 3118],
    rows: [
      new TableRow({ children: [
        tc('Data visita', { bold: true, width: 3119, shading: LIGHT_GREY_BG, size: 16 }),
        tc('Specialista', { bold: true, width: 3119, shading: LIGHT_GREY_BG, size: 16 }),
        tc('Codice scheda', { bold: true, width: 3118, shading: LIGHT_GREY_BG, size: 16 }),
      ]}),
      new TableRow({ children: [
        tc(dataVisita, { bold: true, width: 3119, size: 22 }),
        tc(a.specialista ?? '-', { bold: true, width: 3119, size: 22 }),
        tc(a.codice, { bold: true, width: 3118, size: 18 }),
      ]})
    ]
  })

  const tabDatiPaziente = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [2800, 6556],
    rows: [
      new TableRow({ children: [tc('PAZIENTE', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(a.paziente_nome, { bold: true, width: 6556, size: 24 })] }),
      new TableRow({ children: [tc('DATA NASCITA', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(p?.data_nascita ? `${format(new Date(p.data_nascita), 'dd/MM/yyyy')}  —  Sesso: ${p?.sesso ?? '-'}  —  Età: ${calcEta(p.data_nascita)}` : '-', { width: 6556 })] }),
      new TableRow({ children: [tc('CODICE FISCALE', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(p?.codice_fiscale ?? '-', { width: 6556 })] }),
      new TableRow({ children: [tc('TELEFONO', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(p?.telefono ?? '-', { width: 6556 })] }),
      new TableRow({ children: [tc('EMAIL', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(p?.email ?? '', { width: 6556 })] }),
    ]
  })

  const tabMotivo = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [PAGE_CW],
    rows: [
      new TableRow({ children: [tc('MOTIVO DELLA VISITA', { bold: true, shading: BRAND_BLUE, color: 'FFFFFF', size: 18 })] }),
      new TableRow({ height: { value: 600, rule: HeightRule.ATLEAST }, children: [tc(a.motivo_visita || '-', { italic: true, size: 22 })] })
    ]
  })

  // PARAMETRI VITALI
  const tabParametri = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [1872, 1872, 1872, 1870, 1870],
    rows: [
      new TableRow({ children: [
        tc('PESO', { bold: true, shading: LIGHT_GREY_BG, align: AlignmentType.CENTER, size: 16, width: 1872 }),
        tc('ALTEZZA', { bold: true, shading: LIGHT_GREY_BG, align: AlignmentType.CENTER, size: 16, width: 1872 }),
        tc('P.A.', { bold: true, shading: LIGHT_GREY_BG, align: AlignmentType.CENTER, size: 16, width: 1872 }),
        tc('F.C.', { bold: true, shading: LIGHT_GREY_BG, align: AlignmentType.CENTER, size: 16, width: 1870 }),
        tc('GLICEMIA', { bold: true, shading: LIGHT_GREY_BG, align: AlignmentType.CENTER, size: 16, width: 1870 }),
      ]}),
      new TableRow({ children: [
        tc(a.peso ? `${a.peso} kg` : '-', { bold: true, align: AlignmentType.CENTER, size: 26, width: 1872 }),
        tc(a.altezza ? `${a.altezza} cm` : '-', { bold: true, align: AlignmentType.CENTER, size: 26, width: 1872 }),
        tc(a.pressione_arteriosa || '-', { bold: true, align: AlignmentType.CENTER, size: 26, width: 1872 }),
        tc(a.frequenza_cardiaca ? `${a.frequenza_cardiaca} bpm` : '-', { bold: true, align: AlignmentType.CENTER, size: 26, width: 1870 }),
        tc(a.glicemia ? `${a.glicemia} mg/dL` : '-', { bold: true, align: AlignmentType.CENTER, size: 26, width: 1870 }),
      ]})
    ]
  })

  // ANAMNESI CLINICA
  const tabAnamnesi = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [2800, 6556],
    rows: [
      new TableRow({ children: [tc('PATOLOGIE', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(a.patologie || 'Nessuna riferita', { width: 6556 })] }),
      new TableRow({ children: [tc('INTERVENTI PREGRESSI', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(a.interventi_pregressi || 'Nessuno', { width: 6556 })] }),
      new TableRow({ children: [tc('ALLERGIE', { bold: true, width: 2800, shading: 'FDE7E9', color: RED_ALERT }), tc(a.allergie ? `⚠ ${a.allergie}` : 'Nessuna riferita', { bold: !!a.allergie, color: a.allergie ? RED_ALERT : undefined, width: 6556 })] }),
      new TableRow({ children: [tc('FARMACI IN USO', { bold: true, width: 2800, shading: LIGHT_BLUE_BG }), tc(a.farmaci || 'Nessuno', { width: 6556 })] }),
    ]
  })

  // CONDIZIONI SPECIFICHE
  const tabCondizioni = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [2339, 2339, 2339, 2339],
    rows: [
      new TableRow({ children: [
        tc('Gravidanza', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(a.gravidanza ?? 'No', { width: 2339 }),
        tc('Pacemaker', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(a.pacemaker ?? 'No', { width: 2339 }),
      ]}),
      new TableRow({ children: [
        tc('Prob. circolatori', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(a.prob_circolatori ?? 'No', { width: 2339 }),
        tc('Fototipo', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(a.fototipo || 'N/A', { width: 2339 }),
      ]}),
      new TableRow({ children: [
        tc('Fumo', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(a.fumo ?? '-', { width: 2339 }),
        tc('Alcol', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(a.alcol ?? '-', { width: 2339 }),
      ]}),
      new TableRow({ children: [
        tc('Attività fisica', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(a.attivita_fisica ?? '-', { width: 2339 }),
        tc('BMI calcolato', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 2339 }),
        tc(calcBMI(a.peso, a.altezza), { width: 2339 }),
      ]}),
    ]
  })

  const tabNote = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [PAGE_CW],
    rows: [
      new TableRow({ children: [tc('NOTE INFERMIERA', { bold: true, shading: LIGHT_GREY_BG, size: 16 })] }),
      new TableRow({ height: { value: 600, rule: HeightRule.ATLEAST }, children: [tc(a.note_infermiera || '-', { italic: true })] })
    ]
  })

  // SEZIONE MEDICO
  const medicoHeader = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 240 },
    shading: { fill: RED_ALERT, type: ShadingType.CLEAR },
    children: [new TextRun({ text: '  SEZIONE RISERVATA AL MEDICO  ', bold: true, size: 26, color: 'FFFFFF', font: 'Arial' })]
  })

  const tabEsame = boxCompilabile('ESAME OBIETTIVO', 5)
  const tabDiagnosi = boxCompilabile('DIAGNOSI', 4)

  const tabTerapia = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [3744, 1870, 1870, 1872],
    rows: [
      new TableRow({ children: [
        tc('TERAPIA PRESCRITTA', { bold: true, shading: BRAND_BLUE, color: 'FFFFFF', size: 18 }),
        ec(0), ec(0), ec(0)
      ]}),
      new TableRow({ children: [
        tc('Farmaco / Trattamento', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 3744 }),
        tc('Dosaggio', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 1870, align: AlignmentType.CENTER }),
        tc('Frequenza', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 1870, align: AlignmentType.CENTER }),
        tc('Durata', { bold: true, shading: LIGHT_GREY_BG, size: 16, width: 1872, align: AlignmentType.CENTER }),
      ]}),
      ...Array(5).fill(null).map(() => new TableRow({
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: [ec(3744), ec(1870), ec(1870), ec(1872)]
      }))
    ]
  })

  const tabEsami = boxCompilabile('ESAMI RICHIESTI', 3)

  const tabControllo = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [3118, 6238],
    rows: [
      new TableRow({ children: [tc('PROSSIMO CONTROLLO', { bold: true, shading: BRAND_BLUE, color: 'FFFFFF', size: 18 }), ec(0)] }),
      new TableRow({ children: [
        tc('Data consigliata', { bold: true, shading: LIGHT_GREY_BG, width: 3118 }),
        tc('_____  /  _____  /  ___________', { width: 6238 })
      ]}),
      new TableRow({ children: [
        tc('Urgenza', { bold: true, shading: LIGHT_GREY_BG, width: 3118 }),
        tc('☐ Routine        ☐ Urgente        ☐ Follow-up stretto', { width: 6238 })
      ]}),
      new TableRow({ children: [
        tc('Note', { bold: true, shading: LIGHT_GREY_BG, width: 3118 }),
        ec(6238)
      ]}),
    ]
  })

  const tabRischio = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [3118, 6238],
    rows: [
      new TableRow({ children: [tc('CLASSIFICAZIONE RISCHIO PAZIENTE', { bold: true, shading: BRAND_BLUE, color: 'FFFFFF', size: 18 }), ec(0)] }),
      new TableRow({ children: [
        tc('Rischio calcolato (auto)', { bold: true, shading: LIGHT_GREY_BG, width: 3118 }),
        tc(`${rischio.emoji} ${rischio.livello} — ${rischio.motivo}`, { bold: true, width: 6238 })
      ]}),
      new TableRow({ children: [
        tc('Rischio confermato dal medico', { bold: true, shading: LIGHT_GREY_BG, width: 3118 }),
        tc('☐ BASSO        ☐ MEDIO        ☐ ALTO        ☐ MOLTO ALTO', { width: 6238 })
      ]}),
      new TableRow({ children: [
        tc('Recall consigliato (giorni)', { bold: true, shading: LIGHT_GREY_BG, width: 3118 }),
        tc(`${rischio.recall} giorni`, { width: 6238 })
      ]}),
      new TableRow({ children: [
        tc('Note rischio', { bold: true, shading: LIGHT_GREY_BG, width: 3118 }),
        ec(6238)
      ]}),
    ]
  })

  const tabFirma = new Table({
    width: { size: PAGE_CW, type: WidthType.DXA },
    columnWidths: [4678, 4678],
    rows: [
      new TableRow({ children: [
        new TableCell({
          borders: { top: border, bottom: noBorder, left: noBorder, right: noBorder },
          width: { size: 4678, type: WidthType.DXA },
          margins: { top: 80, bottom: 40, left: 0, right: 0 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Firma Specialista', size: 18, color: '595959', font: 'Arial' })] })]
        }),
        new TableCell({
          borders: { top: border, bottom: noBorder, left: noBorder, right: noBorder },
          width: { size: 4678, type: WidthType.DXA },
          margins: { top: 80, bottom: 40, left: 0, right: 0 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Data: _____ / _____ / __________', size: 18, color: '595959', font: 'Arial' })] })]
        })
      ]})
    ]
  })

  const footer = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 8 } },
    children: [new TextRun({ text: 'Documento generato da DAC Manager • Palazzo della Salute • LABORATORI DAC S.R.L. SOCIETÀ BENEFIT • Trattamento dati ex art. 9 GDPR', italics: true, size: 16, color: '999999', font: 'Arial' })]
  })

  const doc = new Document({
    creator: 'DAC Manager',
    title: 'Scheda Anamnesi Pre-Visita',
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      children: [
        ...header,
        tabVisita,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 80 } }),
        sectionTitle('DATI PAZIENTE'),
        tabDatiPaziente,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 120 } }),
        tabMotivo,
        sectionTitle('PARAMETRI VITALI'),
        tabParametri,
        sectionTitle('ANAMNESI CLINICA'),
        tabAnamnesi,
        sectionTitle('CONDIZIONI SPECIFICHE'),
        tabCondizioni,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 100 } }),
        tabNote,
        medicoHeader,
        tabEsame,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 120 } }),
        tabDiagnosi,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 120 } }),
        tabTerapia,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 120 } }),
        tabEsami,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 120 } }),
        tabControllo,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { after: 120 } }),
        tabRischio,
        new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { before: 400 } }),
        tabFirma,
        footer
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)

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
