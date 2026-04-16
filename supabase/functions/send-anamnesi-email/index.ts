import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, toName, subject, htmlBody, pdfBase64, pdfName, anamnesiId } = await req.json();

    // Carica config mittente
    const configRes = await fetch(`${SUPABASE_URL}/rest/v1/email_config?attivo=eq.true&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    const [config] = await configRes.json();
    if (!config) throw new Error('Configurazione email non trovata');

    // Invia via Brevo
    const brevoPayload: any = {
      sender: { name: config.mittente_nome, email: config.mittente_email },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: htmlBody,
    };

    if (config.cc_direzione) {
      brevoPayload.cc = [{ email: config.cc_direzione }];
    }

    if (pdfBase64 && pdfName) {
      brevoPayload.attachment = [{ content: pdfBase64, name: pdfName }];
    }

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    const brevoData = await brevoRes.json();

    if (!brevoRes.ok) {
      throw new Error(`Brevo error: ${JSON.stringify(brevoData)}`);
    }

    // Aggiorna anamnesi
    if (anamnesiId) {
      await fetch(`${SUPABASE_URL}/rest/v1/anamnesi?id=eq.${anamnesiId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_inviata: true,
          email_inviata_a: to,
          email_inviata_at: new Date().toISOString(),
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: brevoData.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Errore:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
