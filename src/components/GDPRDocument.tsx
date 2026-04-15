import { useRef, useState } from 'react'
import jsPDF from 'jspdf'
import SignatureCanvas from 'react-signature-canvas'
import { X, Check, Eraser, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface PazienteGDPR {
  id: string
  nome: string
  cognome: string
  codice_fiscale: string | null
  data_nascita: string | null
}

interface Props {
  paziente: PazienteGDPR
  onClose: () => void
  onSigned: (url: string) => void
}

const STRUTTURA = {
  nome: 'Palazzo della Salute — LABORATORI DAC S.R.L.',
  indirizzo: 'Catenanuova (EN)',
  titolare: 'LABORATORI DAC S.R.L.',
}

export function GDPRDocument({ paziente, onClose, onSigned }: Props) {
  const sigRef = useRef<SignatureCanvas>(null)
  const consSanitari = true
  const consTerzi = true
  const [consMarketing, setConsMarketing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function clearSig() { sigRef.current?.clear() }

  function buildPDF(signaturePng: string): Blob {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210
    const M = 18
    let y = 18

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text(STRUTTURA.nome, W / 2, y, { align: 'center' }); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.text(`Sede: ${STRUTTURA.indirizzo}`, W / 2, y, { align: 'center' }); y += 4
    doc.text(`Titolare del trattamento: ${STRUTTURA.titolare}`, W / 2, y, { align: 'center' }); y += 8

    doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 6

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('INFORMATIVA E CONSENSO — Reg. UE 2016/679 (GDPR) art. 13-14', M, y); y += 7

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('Dati del paziente', M, y); y += 5
    doc.setFont('helvetica', 'normal')
    const dn = paziente.data_nascita ? format(new Date(paziente.data_nascita), 'dd/MM/yyyy') : '—'
    doc.text(`Nome: ${paziente.nome}`, M, y); doc.text(`Cognome: ${paziente.cognome}`, W / 2, y); y += 5
    doc.text(`Codice Fiscale: ${paziente.codice_fiscale || '—'}`, M, y); doc.text(`Data nascita: ${dn}`, W / 2, y); y += 8

    doc.setFont('helvetica', 'bold')
    doc.text('Informativa ex artt. 13-14 Reg. UE 2016/679 (GDPR)', M, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    const informativa = [
      `1. TITOLARE DEL TRATTAMENTO. ${STRUTTURA.titolare}, con sede in ${STRUTTURA.indirizzo}, è Titolare del`,
      'trattamento dei dati personali dell\'interessato. Contatti reperibili presso la segreteria della struttura.',
      '',
      '2. CATEGORIE DI DATI. Sono trattati dati anagrafici, di contatto, fiscali e — in quanto categoria',
      'particolare ex art. 9 GDPR — dati relativi alla salute: anamnesi, referti, esiti diagnostici, prescrizioni,',
      'immagini diagnostiche, dati di medicina del lavoro e idoneità alla mansione.',
      '',
      '3. FINALITÀ E BASE GIURIDICA. I dati sono trattati per: (a) prevenzione, diagnosi, cura, riabilitazione',
      'e prestazione sanitaria; (b) sorveglianza sanitaria e medicina del lavoro ex D.Lgs. 81/2008; (c)',
      'adempimenti amministrativi, fiscali e contabili; (d) gestione contenzioso e difesa in giudizio.',
      'Base giuridica: art. 9 par. 2 lett. h GDPR (finalità di medicina preventiva, diagnosi, assistenza',
      'o terapia sanitaria da parte di professionisti soggetti al segreto professionale) e D.Lgs. 196/2003',
      'come modificato dal D.Lgs. 101/2018; art. 6 par. 1 lett. b-c-e GDPR per finalità connesse.',
      '',
      '4. DESTINATARI E COMUNICAZIONE. I dati potranno essere comunicati a: medici e professionisti sanitari',
      'collaboratori tenuti al segreto professionale, laboratori di analisi e specialisti esterni per',
      'consulto o esecuzione di prestazioni, enti assicurativi e previdenziali (INAIL, INPS, ASP, ATS),',
      'Autorità sanitarie competenti, consulenti fiscali, responsabili esterni del trattamento nominati',
      'ex art. 28 GDPR (fornitori IT, cloud, software gestionali sanitari). Non è previsto trasferimento',
      'extra-UE; eventuali trasferimenti avverranno con garanzie ex artt. 44-49 GDPR.',
      '',
      '5. CONSERVAZIONE. I dati sanitari e le cartelle cliniche sono conservati per almeno 10 anni dalla',
      'chiusura (Circ. Min. Sanità 61/1986 e giurisprudenza consolidata). I dati di medicina del lavoro',
      'sono conservati 20 anni dalla cessazione del rapporto (art. 41 D.Lgs. 81/2008 e All. 3A). I dati',
      'fiscali-amministrativi 10 anni ex art. 2220 c.c. Decorsi i termini i dati sono cancellati o',
      'anonimizzati, salvo ulteriori obblighi di legge.',
      '',
      '6. DIRITTI DELL\'INTERESSATO. Artt. 15-22 GDPR: accesso ai dati, rettifica, cancellazione (nei limiti',
      'degli obblighi di conservazione sanitaria), limitazione, portabilità, opposizione e revoca del',
      'consenso in qualunque momento (senza pregiudicare la liceità del trattamento precedente). Diritto',
      'di reclamo al Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).',
      '',
      '7. CONFERIMENTO. Il conferimento dei dati per le finalità di cura e sorveglianza sanitaria è',
      'necessario: il rifiuto comporta l\'impossibilità di erogare la prestazione. Il conferimento per',
      'marketing e recall è facoltativo e non pregiudica la prestazione sanitaria.',
      '',
      '8. PROCESSI DECISIONALI AUTOMATIZZATI. Non sono in uso processi decisionali interamente automatizzati',
      'ex art. 22 GDPR.',
    ]
    for (const ln of informativa) {
      if (y > 280) { doc.addPage(); y = 18 }
      doc.text(ln, M, y); y += 3.8
    }
    y += 3
    if (y > 250) { doc.addPage(); y = 18 }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('Consensi espressi', M, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)

    function checkboxRow(label: string, checked: boolean) {
      doc.rect(M, y - 3.5, 4, 4)
      if (checked) { doc.setFont('helvetica', 'bold'); doc.text('X', M + 0.8, y - 0.3); doc.setFont('helvetica', 'normal') }
      const lines = doc.splitTextToSize(label, W - M * 2 - 8)
      doc.text(lines, M + 7, y)
      y += 4 * lines.length + 3
    }
    checkboxRow('1) Trattamento dei dati sanitari per finalità di diagnosi, cura e prestazione sanitaria.', consSanitari)
    checkboxRow('2) Comunicazione dei dati a terzi (laboratori, consulenti, specialisti collaboratori) necessaria alla prestazione.', consTerzi)
    checkboxRow('3) Trattamento per finalità di marketing, recall, newsletter e comunicazioni promozionali (facoltativo).', consMarketing)

    y += 4
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, M, y); y += 8

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text('Firma del paziente (o esercente la potestà)', M, y); y += 3
    doc.addImage(signaturePng, 'PNG', M, y, 70, 25)
    doc.setLineWidth(0.2); doc.line(M, y + 26, M + 80, y + 26)

    return doc.output('blob')
  }

  async function firma() {
    setError(null)
    console.log('[GDPR] firma() start', { pazienteId: paziente.id })
    if (sigRef.current?.isEmpty()) { setError('Firma mancante.'); return }

    setSaving(true)
    try {
      console.log('[GDPR] step 1: generazione PNG firma')
      const pngData = sigRef.current!.getTrimmedCanvas().toDataURL('image/png')
      console.log('[GDPR] PNG generato, length:', pngData.length)

      console.log('[GDPR] step 2: build PDF')
      const blob = buildPDF(pngData)
      console.log('[GDPR] PDF blob:', { size: blob.size, type: blob.type })

      const path = `${paziente.id}/gdpr-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`
      console.log('[GDPR] step 3: upload storage', { bucket: 'gdpr-docs', path })
      const up = await supabase.storage.from('gdpr-docs').upload(path, blob, {
        contentType: 'application/pdf', upsert: true,
      })
      console.log('[GDPR] upload result:', up)
      if (up.error) {
        console.error('[GDPR] upload ERROR:', up.error)
        alert('Errore upload storage: ' + up.error.message + '\n\nVerifica che il bucket "gdpr-docs" esista e sia accessibile.')
        throw up.error
      }

      console.log('[GDPR] step 4: getPublicUrl')
      const { data: pub } = supabase.storage.from('gdpr-docs').getPublicUrl(path)
      const url = pub.publicUrl
      console.log('[GDPR] publicUrl:', url)

      console.log('[GDPR] step 5: update pazienti')
      const { data: updData, error: updErr } = await supabase.from('pazienti')
        .update({ doc_gdpr_url: url, gdpr: 'firmato' })
        .eq('id', paziente.id)
        .select()
      console.log('[GDPR] update result:', { data: updData, error: updErr })
      if (updErr) {
        console.error('[GDPR] update ERROR:', updErr)
        alert('Errore update paziente: ' + updErr.message + '\n\nVerifica che la colonna "doc_gdpr_url" esista in pazienti.')
        throw updErr
      }

      console.log('[GDPR] SUCCESS')
      onSigned(url)
    } catch (e: any) {
      console.error('[GDPR] CATCH:', e)
      const msg = e?.message ?? e?.error_description ?? JSON.stringify(e)
      setError(msg)
      alert('Errore salvataggio GDPR:\n\n' + msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-dac-card border border-white/10 rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-dac-accent" />
            <h3 className="font-display font-bold text-white">Consenso GDPR — {paziente.cognome} {paziente.nome}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-dac-gray-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-dac-gray-200 text-xs leading-relaxed">
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4">
            <div className="font-display font-bold text-white text-sm">{STRUTTURA.nome}</div>
            <div className="text-[11px] text-dac-gray-400">Sede: {STRUTTURA.indirizzo}</div>
            <div className="text-[11px] text-dac-gray-400">Titolare: {STRUTTURA.titolare}</div>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-white">Informativa ex artt. 13-14 GDPR</div>
            <p><b>Titolare:</b> {STRUTTURA.titolare}, {STRUTTURA.indirizzo}.</p>
            <p><b>Finalità:</b> prevenzione, diagnosi, cura, riabilitazione, medicina del lavoro ex D.Lgs. 81/2008,
            adempimenti amministrativi, fiscali e di legge.</p>
            <p><b>Base giuridica:</b> art. 9 par. 2 lett. h GDPR e D.Lgs. 196/2003 come modificato dal
            D.Lgs. 101/2018; art. 6 par. 1 lett. b-c-e GDPR per finalità connesse.</p>
            <p><b>Destinatari:</b> professionisti sanitari e specialisti collaboratori, laboratori di analisi,
            enti assicurativi/previdenziali (INAIL, INPS, ASP), responsabili ex art. 28 GDPR. Nessun trasferimento extra-UE.</p>
            <p><b>Conservazione:</b> 10 anni per cartella clinica (Circ. Min. Sanità 61/1986); 20 anni per medicina
            del lavoro (art. 41 D.Lgs. 81/2008); 10 anni documentazione fiscale (art. 2220 c.c.).</p>
            <p><b>Diritti (artt. 15-22 GDPR):</b> accesso, rettifica, cancellazione (nei limiti di legge),
            limitazione, portabilità, opposizione, revoca del consenso. Reclamo al Garante (www.garanteprivacy.it).</p>
            <p><b>Conferimento:</b> obbligatorio per le finalità di cura; facoltativo per marketing e recall.</p>
            <p>Non sono in uso processi decisionali automatizzati ex art. 22 GDPR.</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="font-bold text-white">Consensi</div>
            <label className="flex items-start gap-2 opacity-80">
              <input type="checkbox" checked readOnly disabled className="mt-0.5" />
              <span><b>Obbligatorio.</b> Acconsento al trattamento dei dati sanitari per diagnosi, cura, prevenzione e medicina del lavoro.</span>
            </label>
            <label className="flex items-start gap-2 opacity-80">
              <input type="checkbox" checked readOnly disabled className="mt-0.5" />
              <span><b>Obbligatorio.</b> Acconsento alla comunicazione dei dati a laboratori terzi e specialisti collaboratori.</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consMarketing} onChange={e => setConsMarketing(e.target.checked)} className="mt-0.5" />
              <span><b>Facoltativo.</b> Acconsento al trattamento per marketing, recall e newsletter.</span>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white">Firma</span>
              <button onClick={clearSig} className="flex items-center gap-1 text-[11px] text-dac-gray-400 hover:text-white">
                <Eraser size={12} /> Cancella
              </button>
            </div>
            <div className="rounded-lg bg-white border border-white/10 overflow-hidden touch-none">
              <SignatureCanvas
                ref={sigRef}
                penColor="#0f1a2e"
                canvasProps={{ className: 'w-full h-40 block' }}
              />
            </div>
            <div className="text-[10px] text-dac-gray-500 mt-1">Firma col dito (tablet) o col mouse.</div>
          </div>

          {error && <div className="rounded-lg bg-dac-red/10 border border-dac-red/30 text-dac-red text-xs px-3 py-2">{error}</div>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10">Annulla</button>
          <button onClick={firma} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-dac-green text-white hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Firma e salva</>}
          </button>
        </div>
      </div>
    </div>
  )
}
