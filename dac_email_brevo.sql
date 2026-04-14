-- ═══════════════════════════════════════════════════════════
-- DAC MANAGER — SISTEMA EMAIL CON BREVO
-- Esegui nel Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════


-- 1. TABELLA TEMPLATES EMAIL
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  oggetto TEXT NOT NULL,           -- Subject line (può contenere {{variabili}})
  corpo_html TEXT NOT NULL,        -- Body HTML con {{variabili}}
  categoria TEXT NOT NULL,         -- reminder, conferma, recall, benvenuto, survey, report, marketing, admin
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates_all" ON email_templates FOR ALL USING (true) WITH CHECK (true);

-- Templates predefiniti
INSERT INTO email_templates (id, nome, oggetto, corpo_html, categoria) VALUES

('reminder_24h', 'Reminder appuntamento 24h', 
'Promemoria: appuntamento domani {{ora}} presso Palazzo della Salute',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#1a3a5c;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">🏥 Palazzo della Salute</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>Le ricordiamo il suo appuntamento:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;color:#666">📅 Data</td><td style="padding:8px;font-weight:bold">{{data}}</td></tr>
<tr><td style="padding:8px;color:#666">🕐 Ora</td><td style="padding:8px;font-weight:bold">{{ora}}</td></tr>
<tr><td style="padding:8px;color:#666">👤 Operatore</td><td style="padding:8px;font-weight:bold">{{operatore}}</td></tr>
<tr><td style="padding:8px;color:#666">📋 Servizio</td><td style="padding:8px;font-weight:bold">{{servizio}}</td></tr>
</table>
{{#if preparazione}}<p style="background:#fff3cd;padding:12px;border-radius:8px;border-left:4px solid #f39c12">⚠️ <strong>Preparazione:</strong> {{preparazione}}</p>{{/if}}
<p style="color:#666;font-size:13px">Per disdire o spostare l''appuntamento, contattaci al <strong>0935 XXXXXX</strong></p>
</div>
<p style="text-align:center;color:#999;font-size:11px;margin-top:16px">Palazzo della Salute — Via ... , Catenanuova (EN)</p>
</div>', 'reminder'),

('conferma_appuntamento', 'Conferma appuntamento',
'Appuntamento confermato: {{data}} alle {{ora}}',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#27ae60;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">✅ Appuntamento Confermato</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>Il suo appuntamento è stato confermato:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;color:#666">📅 Data</td><td style="padding:8px;font-weight:bold">{{data}}</td></tr>
<tr><td style="padding:8px;color:#666">🕐 Ora</td><td style="padding:8px;font-weight:bold">{{ora}}</td></tr>
<tr><td style="padding:8px;color:#666">📋 Servizio</td><td style="padding:8px;font-weight:bold">{{servizio}}</td></tr>
</table>
<p>La aspettiamo! 😊</p>
</div>
</div>', 'conferma'),

('benvenuto', 'Benvenuto nuovo paziente',
'Benvenuto al Palazzo della Salute! 🏥',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#1a3a5c;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:22px">🏥 Benvenuto!</h1>
<p style="margin:8px 0 0;opacity:.8">Palazzo della Salute — Catenanuova</p>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>Siamo lieti di accoglierla nella nostra struttura. Ecco cosa offriamo:</p>
<ul style="padding-left:20px;line-height:2">
<li>🔬 <strong>Laboratorio analisi</strong> — risultati rapidi e affidabili</li>
<li>💅 <strong>Estetica avanzata</strong> — laser, peeling, radiofrequenza</li>
<li>🩺 <strong>Visite specialistiche</strong> — dermatologia, endocrinologia, nutrizione, cardiologia</li>
<li>💊 <strong>Parafarmacia</strong> — prodotti selezionati</li>
</ul>
<p>Per qualsiasi esigenza, ci contatti al <strong>0935 XXXXXX</strong> o rispondendo a questa email.</p>
<p>Cordiali saluti,<br><strong>Il team del Palazzo della Salute</strong></p>
</div>
</div>', 'benvenuto'),

('recall_paziente', 'Recall visita di controllo',
'È ora del suo controllo: prenoti il suo appuntamento',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#e67e22;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">📅 Promemoria Controllo</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>È passato un po'' di tempo dalla sua ultima visita (<strong>{{ultimo_servizio}}</strong>).</p>
<p>Le consigliamo di prenotare un controllo per monitorare il suo stato di salute.</p>
<p style="text-align:center;margin:24px 0">
<a href="tel:0935XXXXXX" style="background:#e67e22;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">📞 Chiama per prenotare</a>
</p>
<p style="color:#666;font-size:13px">Se ha già prenotato, ignori questo messaggio.</p>
</div>
</div>', 'recall'),

('recall_incentivo', 'Recall con incentivo',
'Solo per lei: {{sconto_pct}}% di sconto sulla prossima visita',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#8e44ad;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">🎁 Offerta Esclusiva</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>Ci manchi! Per ringraziarla della sua fiducia, le riserviamo uno <strong>sconto del {{sconto_pct}}%</strong> sulla prossima visita.</p>
<p style="background:#f0e6f6;padding:16px;border-radius:8px;text-align:center;font-size:24px;font-weight:bold;color:#8e44ad">-{{sconto_pct}}%</p>
<p>L''offerta è valida per <strong>{{validita_giorni}} giorni</strong>. Prenoti ora!</p>
<p style="text-align:center;margin:24px 0">
<a href="tel:0935XXXXXX" style="background:#8e44ad;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">📞 Prenota con sconto</a>
</p>
</div>
</div>', 'recall'),

('noshow_educativo', 'No-show educativo',
'Nota importante sul suo appuntamento mancato',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#e74c3c;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">⚠️ Appuntamento Mancato</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>Abbiamo notato che non si è presentato/a all''appuntamento del <strong>{{data}}</strong> alle <strong>{{ora}}</strong>.</p>
<p>La preghiamo di avvisarci in anticipo in caso di impedimento, in modo da poter offrire lo slot ad altri pazienti in attesa.</p>
<p>Per riprogrammare, ci contatti al <strong>0935 XXXXXX</strong>.</p>
</div>
</div>', 'admin'),

('survey_soddisfazione', 'Survey post-visita',
'Come è andata la sua visita? ⭐',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#2e86c1;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">⭐ La sua opinione conta</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>Come valuta la sua esperienza del <strong>{{data}}</strong> per il servizio <strong>{{servizio}}</strong>?</p>
<p style="text-align:center;font-size:32px;margin:24px 0">
<a href="{{link_survey}}&rating=1" style="text-decoration:none">😞</a>&nbsp;&nbsp;
<a href="{{link_survey}}&rating=2" style="text-decoration:none">😐</a>&nbsp;&nbsp;
<a href="{{link_survey}}&rating=3" style="text-decoration:none">🙂</a>&nbsp;&nbsp;
<a href="{{link_survey}}&rating=4" style="text-decoration:none">😊</a>&nbsp;&nbsp;
<a href="{{link_survey}}&rating=5" style="text-decoration:none">🤩</a>
</p>
<p style="color:#666;font-size:13px;text-align:center">Clicchi sull''emoji che meglio rappresenta la sua esperienza</p>
</div>
</div>', 'survey'),

('compleanno', 'Auguri compleanno',
'Tanti auguri {{paziente_nome}}! 🎂 Un regalo per te',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:linear-gradient(135deg,#8e44ad,#e74c3c);color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:28px">🎂 Auguri!</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Carissimo/a <strong>{{paziente_nome}}</strong>,</p>
<p>Tutto il team del Palazzo della Salute ti augura un felicissimo compleanno! 🎉</p>
<p>Come regalo, ti offriamo uno <strong>sconto del {{sconto_pct}}%</strong> sul tuo prossimo trattamento, valido {{validita_giorni}} giorni.</p>
<p style="text-align:center;margin:24px 0">
<a href="tel:0935XXXXXX" style="background:#8e44ad;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">🎁 Prenota con sconto</a>
</p>
</div>
</div>', 'marketing'),

('riepilogo_visita', 'Riepilogo post-visita',
'Riepilogo della sua visita del {{data}}',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#27ae60;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">📋 Riepilogo Visita</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>Ecco il riepilogo della sua visita:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;color:#666">📅 Data</td><td style="padding:8px;font-weight:bold">{{data}}</td></tr>
<tr><td style="padding:8px;color:#666">📋 Servizio</td><td style="padding:8px;font-weight:bold">{{servizio}}</td></tr>
<tr><td style="padding:8px;color:#666">👤 Operatore</td><td style="padding:8px;font-weight:bold">{{operatore}}</td></tr>
</table>
{{#if consigli}}<p style="background:#e8f5e9;padding:12px;border-radius:8px;border-left:4px solid #27ae60">💡 <strong>Consigli:</strong> {{consigli}}</p>{{/if}}
<p style="color:#666;font-size:13px">Per qualsiasi domanda, non esiti a contattarci.</p>
</div>
</div>', 'conferma'),

('risultati_pronti', 'Risultati analisi disponibili',
'I suoi risultati sono pronti 🔬',
'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#3498db;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="margin:0;font-size:20px">🔬 Risultati Disponibili</h1>
</div>
<div style="background:#f8f9fa;padding:24px;border-radius:0 0 12px 12px">
<p>Gentile <strong>{{paziente_nome}}</strong>,</p>
<p>I risultati delle sue analisi del <strong>{{data}}</strong> sono pronti.</p>
<p>Può ritirarli presso la nostra segreteria oppure contattarci per informazioni.</p>
<p style="text-align:center;margin:24px 0">
<a href="tel:0935XXXXXX" style="background:#3498db;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">📞 Contattaci</a>
</p>
</div>
</div>', 'conferma')

ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome, oggetto=EXCLUDED.oggetto, corpo_html=EXCLUDED.corpo_html, categoria=EXCLUDED.categoria;


-- 2. TABELLA CODA EMAIL
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_coda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destinatario_email TEXT NOT NULL,
  destinatario_nome TEXT,
  template_id TEXT REFERENCES email_templates(id),
  oggetto TEXT,                     -- override oggetto template
  corpo_html TEXT,                  -- override corpo template
  variabili JSONB DEFAULT '{}',     -- {{variabili}} da sostituire nel template
  stato TEXT DEFAULT 'in_coda',     -- in_coda, inviata, errore, annullata
  tentativo INTEGER DEFAULT 0,
  max_tentativi INTEGER DEFAULT 3,
  errore TEXT,
  automazione_id TEXT,              -- quale automazione l'ha generata
  paziente_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  inviata_at TIMESTAMPTZ,
  prossimo_tentativo TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_coda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_coda_all" ON email_coda FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_email_coda_stato ON email_coda(stato) WHERE stato = 'in_coda';
CREATE INDEX IF NOT EXISTS idx_email_coda_prossimo ON email_coda(prossimo_tentativo) WHERE stato = 'in_coda';


-- 3. TABELLA LOG EMAIL INVIATE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_coda_id UUID,
  destinatario TEXT NOT NULL,
  oggetto TEXT,
  stato TEXT NOT NULL,               -- inviata, errore
  brevo_message_id TEXT,
  errore TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_log_all" ON email_log FOR ALL USING (true) WITH CHECK (true);


-- 4. FUNZIONE: Accoda email (chiamabile da qualsiasi trigger)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION accoda_email(
  p_destinatario_email TEXT,
  p_destinatario_nome TEXT,
  p_template_id TEXT,
  p_variabili JSONB DEFAULT '{}',
  p_automazione_id TEXT DEFAULT NULL,
  p_paziente_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Controlla che il template esista e sia attivo
  IF NOT EXISTS (SELECT 1 FROM email_templates WHERE id = p_template_id AND attivo = true) THEN
    RETURN NULL;
  END IF;

  -- Controlla che l'automazione sia attiva (se specificata)
  IF p_automazione_id IS NOT NULL AND NOT is_automazione_attiva(p_automazione_id) THEN
    RETURN NULL;
  END IF;

  -- Evita duplicati: stessa email + stesso template nelle ultime 24h
  IF EXISTS (
    SELECT 1 FROM email_coda
    WHERE destinatario_email = p_destinatario_email
      AND template_id = p_template_id
      AND created_at > now() - INTERVAL '24 hours'
      AND stato != 'annullata'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO email_coda (destinatario_email, destinatario_nome, template_id, variabili, automazione_id, paziente_id)
  VALUES (p_destinatario_email, p_destinatario_nome, p_template_id, p_variabili, p_automazione_id, p_paziente_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;


-- 5. FUNZIONE: Processa coda (chiamata dalla Edge Function)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_email_da_inviare(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID, destinatario_email TEXT, destinatario_nome TEXT,
  template_id TEXT, oggetto TEXT, corpo_html TEXT,
  variabili JSONB, automazione_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id, ec.destinatario_email, ec.destinatario_nome,
    ec.template_id,
    COALESCE(ec.oggetto, et.oggetto) AS oggetto,
    COALESCE(ec.corpo_html, et.corpo_html) AS corpo_html,
    ec.variabili, ec.automazione_id
  FROM email_coda ec
  LEFT JOIN email_templates et ON et.id = ec.template_id
  WHERE ec.stato = 'in_coda'
    AND ec.prossimo_tentativo <= now()
    AND ec.tentativo < ec.max_tentativi
  ORDER BY ec.created_at
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- 6. FUNZIONE: Segna email come inviata/errore
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION segna_email_inviata(p_id UUID, p_brevo_id TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE email_coda SET stato = 'inviata', inviata_at = now(), tentativo = tentativo + 1 WHERE id = p_id;
  INSERT INTO email_log (email_coda_id, destinatario, oggetto, stato, brevo_message_id)
  SELECT p_id, destinatario_email, oggetto, 'inviata', p_brevo_id FROM email_coda WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION segna_email_errore(p_id UUID, p_errore TEXT)
RETURNS void AS $$
BEGIN
  UPDATE email_coda SET
    tentativo = tentativo + 1,
    errore = p_errore,
    stato = CASE WHEN tentativo + 1 >= max_tentativi THEN 'errore' ELSE 'in_coda' END,
    prossimo_tentativo = now() + (INTERVAL '5 minutes' * (tentativo + 1))
  WHERE id = p_id;
  INSERT INTO email_log (email_coda_id, destinatario, oggetto, stato, errore)
  SELECT p_id, destinatario_email, oggetto, 'errore', p_errore FROM email_coda WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;


-- 7. SALVA API KEY BREVO COME SECRET
-- ═══════════════════════════════════════════════════════════
-- Dopo aver ottenuto la API key da Brevo, salvala:
-- INSERT INTO configurazione (chiave, valore) VALUES ('brevo_api_key', 'xkeysib-LA-TUA-API-KEY') ON CONFLICT (chiave) DO UPDATE SET valore = EXCLUDED.valore;
-- INSERT INTO configurazione (chiave, valore) VALUES ('email_mittente', 'accettazione@palazzodellasalute.it') ON CONFLICT (chiave) DO UPDATE SET valore = EXCLUDED.valore;
-- INSERT INTO configurazione (chiave, valore) VALUES ('nome_mittente', 'Palazzo della Salute') ON CONFLICT (chiave) DO UPDATE SET valore = EXCLUDED.valore;


-- ═══════════════════════════════════════════════════════════
-- FINE
-- ═══════════════════════════════════════════════════════════
