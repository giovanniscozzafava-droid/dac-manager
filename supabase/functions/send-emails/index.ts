// supabase/functions/send-emails/index.ts
// Deploy con: supabase functions deploy send-emails
// Oppure chiamala via HTTP POST

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Sostituisce {{variabili}} nel template
function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, String(value ?? ''))
  }
  // Rimuovi variabili non sostituite
  result = result.replace(/\{\{[^}]+\}\}/g, '')
  // Gestione semplice {{#if var}}...{{/if}}
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    return variables[varName] ? content : ''
  })
  return result
}

// Invia una singola email via Brevo
async function sendViaBrivo(
  apiKey: string,
  from: { email: string; name: string },
  to: { email: string; name?: string },
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: from.email, name: from.name },
        to: [{ email: to.email, name: to.name || to.email }],
        subject,
        htmlContent,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return { success: true, messageId: data.messageId }
    } else {
      const error = await response.text()
      return { success: false, error: `Brevo HTTP ${response.status}: ${error}` }
    }
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` }
  }
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    // Leggi configurazione
    const { data: configRows } = await supabase
      .from('configurazione')
      .select('chiave, valore')
      .in('chiave', ['brevo_api_key', 'email_mittente', 'nome_mittente'])

    const config: Record<string, string> = {}
    configRows?.forEach((r: any) => { config[r.chiave] = r.valore })

    const apiKey = config.brevo_api_key
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Brevo API key non configurata. Vai in Config → Struttura.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const from = {
      email: config.email_mittente || 'noreply@palazzodellasalute.it',
      name: config.nome_mittente || 'Palazzo della Salute',
    }

    // Prendi email dalla coda
    const { data: emails } = await supabase.rpc('get_email_da_inviare', { p_limit: 50 })

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'Nessuna email in coda' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    let sent = 0
    let errors = 0

    for (const email of emails) {
      // Sostituisci variabili nel template
      const subject = replaceVariables(email.oggetto || '', email.variabili || {})
      const html = replaceVariables(email.corpo_html || '', email.variabili || {})

      // Invia
      const result = await sendViaBrivo(
        apiKey,
        from,
        { email: email.destinatario_email, name: email.destinatario_nome },
        subject,
        html
      )

      if (result.success) {
        await supabase.rpc('segna_email_inviata', { p_id: email.id, p_brevo_id: result.messageId })
        sent++
      } else {
        await supabase.rpc('segna_email_errore', { p_id: email.id, p_errore: result.error })
        errors++
      }

      // Rate limiting: max 10 email/secondo per Brevo free
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return new Response(JSON.stringify({ processed: emails.length, sent, errors }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
