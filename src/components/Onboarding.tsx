import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SETTORI = [
  { value: 'Lab Analisi', emoji: '🔬', desc: '1° Piano — Analisi cliniche' },
  { value: 'Estetica Laser/Viso', emoji: '👩‍🔬', desc: '2° Piano — Laser, radiofrequenza, viso' },
  { value: 'Estetica Corpo/Mani', emoji: '💅', desc: '2° Piano — Corpo, mani, piedi' },
  { value: 'Ambulatorio Specialisti', emoji: '🩺', desc: '2° Piano — Visite specialistiche' },
  { value: 'Parafarmacia', emoji: '💊', desc: 'Piano terra — Vendita e consulenza' },
  { value: 'Segreteria', emoji: '📞', desc: 'Accettazione, prenotazioni, recall' },
  { value: 'Direzione', emoji: '👔', desc: 'Amministrazione e gestione' },
]

interface Props {
  operatoreId: string
  email: string
  onCompleted: () => void
}

export function Onboarding({ operatoreId, email, onCompleted }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Campi
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [settore, setSettore] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dataNascita, setDataNascita] = useState('')
  const [codiceFiscale, setCodiceFiscale] = useState('')
  const [luogoNascita, setLuogoNascita] = useState('')
  const [via, setVia] = useState('')
  const [cap, setCap] = useState('')
  const [citta, setCitta] = useState('')
  const [provincia, setProvincia] = useState('')

  function nextStep() {
    if (step === 1 && (!nome.trim() || !cognome.trim())) { setError('Nome e cognome obbligatori'); return }
    if (step === 2 && !settore) { setError('Seleziona il tuo settore'); return }
    setError(''); setStep(s => s + 1)
  }

  async function salva() {
    if (!telefono.trim()) { setError('Il telefono è obbligatorio'); return }
    setSaving(true); setError('')
    const sel = SETTORI.find(s => s.value === settore)
    const { error: err } = await supabase.from('operatori').update({
      nome: nome.trim(),
      cognome: cognome.trim(),
      emoji: sel?.emoji ?? '👤',
      settore,
      telefono: telefono.trim(),
      data_nascita: dataNascita || null,
      codice_fiscale: codiceFiscale.toUpperCase() || null,
      luogo_nascita: luogoNascita || null,
      via: via || null,
      cap: cap || null,
      citta: citta || null,
      provincia: provincia.toUpperCase() || null,
      profilo_completo: true,
    }).eq('id', operatoreId)

    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onCompleted()
  }

  return (
    <div className="h-screen flex items-center justify-center bg-dac-navy noise-bg overflow-auto">
      <div className="w-full max-w-md mx-4 my-8 animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="font-display text-xl font-bold text-white">Benvenuto in DAC Manager</h1>
          <p className="text-dac-gray-400 text-sm mt-1">Completa il tuo profilo per iniziare</p>
          <p className="text-[10px] text-dac-gray-500 mt-1">{email}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/5">
              <div className={`h-full rounded-full transition-all duration-500 ${s <= step ? 'bg-dac-accent' : ''}`}
                style={{ width: s < step ? '100%' : s === step ? '50%' : '0%' }} />
            </div>
          ))}
        </div>

        <div className="bg-dac-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* STEP 1: Chi sei */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div className="text-center mb-2">
                <span className="text-3xl">📋</span>
                <h2 className="text-sm font-bold text-white mt-2">Chi sei?</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Nome *</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" autoFocus />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Cognome *</label>
                  <input type="text" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Codice Fiscale</label>
                <input type="text" value={codiceFiscale} onChange={e => setCodiceFiscale(e.target.value)} placeholder="RSSMRA85T10F158X" maxLength={16}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono uppercase placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Data di nascita</label>
                  <input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-dac-accent/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Luogo di nascita</label>
                  <input type="text" value={luogoNascita} onChange={e => setLuogoNascita(e.target.value)} placeholder="Catania"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Settore */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              <div className="text-center mb-2">
                <span className="text-3xl">🏥</span>
                <h2 className="text-sm font-bold text-white mt-2">In che settore operi?</h2>
                <p className="text-[10px] text-dac-gray-500 mt-1">Riceverai task, comunicazioni e notifiche del tuo reparto</p>
              </div>
              <div className="space-y-1.5">
                {SETTORI.map(s => (
                  <button key={s.value} type="button" onClick={() => { setSettore(s.value); setError('') }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border
                      ${settore === s.value
                        ? 'bg-dac-accent/10 border-dac-accent/30 text-white'
                        : 'bg-white/[0.02] border-white/5 text-dac-gray-400 hover:bg-white/[0.04]'}`}>
                    <span className="text-xl">{s.emoji}</span>
                    <div>
                      <div className="text-xs font-semibold">{s.value}</div>
                      <div className="text-[10px] text-dac-gray-500">{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Contatti e indirizzo */}
          {step === 3 && (
            <div className="p-6 space-y-4">
              <div className="text-center mb-2">
                <span className="text-3xl">📍</span>
                <h2 className="text-sm font-bold text-white mt-2">Contatti e indirizzo</h2>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Telefono *</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="340 1234567"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Via</label>
                <input type="text" value={via} onChange={e => setVia(e.target.value)} placeholder="Via Roma 1"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">CAP</label>
                  <input type="text" value={cap} onChange={e => setCap(e.target.value)} placeholder="94010" maxLength={5}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Città</label>
                  <input type="text" value={citta} onChange={e => setCitta(e.target.value)} placeholder="Catenanuova"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-dac-gray-400 mb-1">Prov.</label>
                  <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} placeholder="EN" maxLength={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm uppercase placeholder:text-dac-gray-500 focus:outline-none focus:border-dac-accent/50" />
                </div>
              </div>
            </div>
          )}

          {/* Errore */}
          {error && <div className="mx-6 mb-4 px-3 py-2 rounded-lg bg-dac-red/10 border border-dac-red/20 text-xs text-dac-red">❌ {error}</div>}

          {/* Bottoni */}
          <div className="flex gap-2 px-6 pb-6">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/5 text-dac-gray-300 hover:bg-white/10 transition-colors">
                ← Indietro
              </button>
            )}
            {step < 3 ? (
              <button onClick={nextStep}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-dac-accent text-white hover:opacity-90 transition-all">
                Avanti →
              </button>
            ) : (
              <button onClick={salva} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-dac-green text-white hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✅ Completa profilo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
