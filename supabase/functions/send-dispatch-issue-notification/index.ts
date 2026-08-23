import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPayload {
  toEmail: string;
  toName: string;
  guideNumber: string;
  siteName: string;
  issueTypeLabel: string;
  description: string;
  raisedByName: string;
}

function isNotifyPayload(value: unknown): value is NotifyPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.toEmail === 'string' &&
    typeof v.toName === 'string' &&
    typeof v.guideNumber === 'string' &&
    typeof v.siteName === 'string' &&
    typeof v.issueTypeLabel === 'string' &&
    typeof v.description === 'string' &&
    typeof v.raisedByName === 'string'
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  if (!isNotifyPayload(payload)) {
    return jsonResponse({ error: 'Payload inválido' }, 400);
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    // Sin proveedor de email configurado todavía: no es un error del cliente — se responde
    // 200 para no bloquear el flujo de "levantar incidencia" mientras se configura Resend.
    return jsonResponse({ sent: false, reason: 'RESEND_API_KEY no configurado' }, 200);
  }

  const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') ?? 'SUSPEL <onboarding@resend.dev>';

  const html = `
    <p>Se levantó una incidencia de guía de despacho en SUSPEL.</p>
    <ul>
      <li><strong>Guía:</strong> ${escapeHtml(payload.guideNumber)}</li>
      <li><strong>Área:</strong> ${escapeHtml(payload.siteName)}</li>
      <li><strong>Motivo:</strong> ${escapeHtml(payload.issueTypeLabel)}</li>
      <li><strong>Descripción:</strong> ${escapeHtml(payload.description)}</li>
      <li><strong>Levantada por:</strong> ${escapeHtml(payload.raisedByName)}</li>
    </ul>
  `;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [payload.toEmail],
      subject: `Nueva incidencia de guía de despacho — Guía ${payload.guideNumber}`,
      html,
    }),
  });

  const resendBody = await resendResponse.text();
  return jsonResponse({ sent: resendResponse.ok, resend: resendBody }, 200);
});
