import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

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
  telefono: string | null
  email: string | null
  via: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
}

export function generaAnamnesiPDF(a: AnamnesiData, p: PazienteData | null): { blob: Blob; base64: string; filename: string } {
  const doc = new jsPDF()
  let y = 20
  const leftMargin = 20
  const rightMargin = 190
  const lineHeight = 6

  const checkPage = (needed: number = 10) => {
    if (y + needed > 280) {
      doc.addPage()
      y = 20
    }
  }

  const addTitle = (text: string, size: number = 14) => {
    checkPage(15)
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.text(text, leftMargin, y)
    y += lineHeight + 2
  }

  const addSection = (title: string) => {
    checkPage(15)
    y += 3
    doc.setFillColor(230, 240, 255)
    doc.rect(leftMargin - 2, y - 5, rightMargin - leftMargin + 4, 8, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 80, 150)
    doc.text(title, leftMargin, y)
    doc.setTextColor(0, 0, 0)
    y += lineHeight + 3
  }

  const addField = (label: string, value: string | null | number, bold: boolean = false) => {
    if (value === null || value === undefined || value === '') return
    checkPage(8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', leftMargin, y)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const text = String(value)
    const split = doc.splitTextToSize(text, 130)
    doc.text(split, leftMargin + 45, y)
    y += (split.length * lineHeight)
    if (split.length > 1) y += 1
  }

  doc.setFillColor(20, 50, 100)
  doc.rect(0, 0, 210, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PALAZZO DELLA SALUTE', leftMargin, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('LABORATORI DAC S.R.L. - Catenanuova (EN)', leftMargin, 18)
  doc.setTextColor(0, 0, 0)
  y = 35

  addTitle('SCHEDA ANAMNESTICA', 16)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Codice: ' + a.codice, leftMargin, y)
  doc.text('Data: ' + format(new Date(a.created_at), 'dd/MM/yyyy HH:mm', { locale: it }), 130, y)
  y += lineHeight + 3

  addSection('DATI PAZIENTE')
  addField('Cognome e Nome', a.paziente_nome, true)
  if (p) {
    addField('Codice Fiscale', p.codice_fiscale)
    addField('Data di nascita', p.data_nascita ? format(new Date(p.data_nascita), 'dd/MM/yyyy') : null)
    addField('Telefono', p.telefono)
    addField('Email', p.email)
    const indirizzo = [p.via, p.cap, p.citta, p.provincia ? '(' + p.provincia + ')' : ''].filter(Boolean).join(', ')
    if (indirizzo) addField('Indirizzo', indirizzo)
  }
  addField('Specialista destinatario', a.specialista, true)

  if (a.motivo_visita) {
    addSection('MOTIVO DELLA VISITA')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const split = doc.splitTextToSize(a.motivo_visita, 170)
    checkPage(split.length * lineHeight + 5)
    doc.text(split, leftMargin, y)
    y += split.length * lineHeight + 2
  }

  if (a.peso || a.altezza || a.pressione_arteriosa || a.frequenza_cardiaca || a.glicemia) {
    addSection('PARAMETRI VITALI')
    if (a.peso) addField('Peso', a.peso + ' kg')
    if (a.altezza) addField('Altezza', a.altezza + ' cm')
    if (a.pressione_arteriosa) addField('Pressione arteriosa', a.pressione_arteriosa + ' mmHg')
    if (a.frequenza_cardiaca) addField('Frequenza cardiaca', a.frequenza_cardiaca + ' bpm')
    if (a.glicemia) addField('Glicemia', a.glicemia + ' mg/dL')
    if (a.peso && a.altezza) {
      const bmi = (a.peso / Math.pow(a.altezza / 100, 2)).toFixed(1)
      addField('BMI', bmi)
    }
  }

  if (a.patologie || a.allergie || a.farmaci || a.interventi_pregressi) {
    addSection('ANAMNESI CLINICA')
    addField('Patologie', a.patologie)
    addField('Allergie', a.allergie)
    addField('Farmaci in uso', a.farmaci)
    addField('Interventi pregressi', a.interventi_pregressi)
  }

  addSection('CHECKLIST SICUREZZA')
  addField('Gravidanza', a.gravidanza ?? 'No')
  addField('Pacemaker', a.pacemaker ?? 'No')
  addField('Problemi circolatori', a.prob_circolatori ?? 'No')
  if (a.fototipo) addField('Fototipo', a.fototipo)

  if (a.fumo || a.alcol || a.attivita_fisica) {
    addSection('STILE DI VITA')
    if (a.fumo) addField('Fumo', a.fumo)
    if (a.alcol) addField('Alcol', a.alcol)
    if (a.attivita_fisica) addField('Attivita fisica', a.attivita_fisica)
  }

  if (a.mansione || a.rischio_lavorativo || a.idoneita) {
    addSection('MEDICINA DEL LAVORO')
    addField('Mansione', a.mansione)
    addField('Rischio lavorativo', a.rischio_lavorativo)
    addField('Idoneita', a.idoneita, true)
  }

  if (a.note_infermiera) {
    addSection('NOTE INFERMIERA')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const split = doc.splitTextToSize(a.note_infermiera, 170)
    checkPage(split.length * lineHeight + 5)
    doc.text(split, leftMargin, y)
    y += split.length * lineHeight + 2
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(120, 120, 120)
    doc.text('Documento riservato - trattamento ex art. 9 GDPR e D.Lgs. 196/2003', 105, 290, { align: 'center' })
    doc.text('Pagina ' + i + ' di ' + pageCount, 105, 294, { align: 'center' })
  }

  const blob = doc.output('blob')
  const base64 = doc.output('datauristring').split(',')[1]
  const filename = 'anamnesi_' + a.codice + '_' + format(new Date(), 'yyyyMMdd_HHmm') + '.pdf'

  return { blob, base64, filename }
}
