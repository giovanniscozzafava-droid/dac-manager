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
  const [consSanitari, setConsSanitari] = useState(false)
  const [consTerzi, setConsTerzi] = useState(false)
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
    doc.text('Informativa ex art. 13-14 GDPR per trattamento dati sanitari', M, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    const informativa = [
      `Il Titolare del trattamento è ${STRUTTURA.titolare}, con sede in ${STRUTTURA.indirizzo}.`,
      'I dati personali e sanitari (categorie particolari ex art. 9 GDPR) sono trattati per finalità di',
      'prevenzione, diagnosi, cura, riabilitazione, gestione amministrativa della prestazione sanitaria e',
      'adempimenti di legge (fatturazione, conservazione cartelle cliniche, obblighi fiscali e previdenziali).',
      'Base giuridica: art. 6 lett. b-c-e e art. 9 lett. h GDPR (finalità di cura da parte di professionisti',
      'sanitari tenuti al segreto professionale).',
      'I dati potranno essere comunicati a: professionisti sanitari collaboratori, laboratori di analisi,',
      'enti assicurativi/previdenziali, pubbliche amministrazioni, autorità sanitarie, consulenti fiscali.',
      'I dati sono conservati per il tempo previsto dalla normativa sanitaria (minimo 10 anni cartella clinica).',
      'Diritti dell\'interessato (artt. 15-22 GDPR): accesso, rettifica, cancellazione, limitazione, portabilità,',
      'opposizione e reclamo al Garante Privacy (www.garanteprivacy.it).',
      'Il conferimento dei dati per finalità di cura è necessario: il rifiuto comporta impossibilità di erogare',
      'la prestazione sanitaria. Il conferimento per finalità di marketing è facoltativo.',
    ]
    for (const ln of informativa) { doc.text(ln, M, y); y += 4 }
    y += 3

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
    if (sigRef.current?.isEmpty()) { setError('Firma mancante.'); return }
    if (!consSanitari) { setError('Il consenso al trattamento sanitario è obbligatorio.'); return }

    setSaving(true)
    try {
      const pngData = sigRef.current!.getTrimmedCanvas().toDataURL('image/png')
      const blob = buildPDF(pngData)
      const path = `${paziente.id}/gdpr-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`
      const up = await supabase.storage.from('gdpr-docs').upload(path, blob, {
        contentType: 'application/pdf', upsert: true,
      })
      if (up.error) throw up.error
      const { data: pub } = supabase.storage.from('gdpr-docs').getPublicUrl(path)
      const url = pub.publicUrl
      const { error: updErr } = await supabase.from('pazienti')
        .update({ doc_gdpr_url: url, gdpr: 'firmato' })
        .eq('id', paziente.id)
      if (updErr) throw updErr
      onSigned(url)
    } catch (e: any) {
      setError(e?.message ?? 'Errore durante il salvataggio.')
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

          <div>
            <div className="font-bold text-white mb-1">Informativa ex art. 13-14 GDPR</div>
            <p>I dati personali e sanitari (art. 9 GDPR) sono trattati per diagnosi, cura, prestazione
            sanitaria e adempimenti di legge. Base giuridica: art. 6 b-c-e e art. 9 h GDPR. Conservazione:
            10 anni (cartella clinica). Diritti artt. 15-22 GDPR: accesso, rettifica, cancellazione,
            limitazione, portabilità, opposizione e reclamo al Garante.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consSanitari} onChange={e => setConsSanitari(e.target.checked)} className="mt-0.5" />
              <span><b>Obbligatorio.</b> Acconsento al trattamento dei dati sanitari per diagnosi, cura e prestazione.</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consTerzi} onChange={e => setConsTerzi(e.target.checked)} className="mt-0.5" />
              <span>Acconsento alla comunicazione dei dati a laboratori, consulenti e specialisti collaboratori.</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consMarketing} onChange={e => setConsMarketing(e.target.checked)} className="mt-0.5" />
              <span>Acconsento al trattamento per finalità di marketing, recall e newsletter (facoltativo).</span>
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
