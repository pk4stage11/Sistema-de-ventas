import {
  esEnvioHoneypot,
  landingLeadSchema,
  normalizeLandingSubmission,
} from '@/lib/channels/landing';
import { ingestInboundMessage } from '@/lib/channels/ingest';
import { verificarRateLimit } from '@/lib/security/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Necesita runtime Node: usa el cliente admin de Supabase.
export const runtime = 'nodejs';

const LIMITE_RATE = { maxIntentos: 5, ventanaMs: 10 * 60_000 }; // 5 envíos / 10 min por IP

function obtenerIp(request: Request): string {
  // Vercel puebla x-forwarded-for; en dev/otros hosts puede venir vacío.
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || 'desconocida';
}

/**
 * Recibe envíos del formulario de landing. A diferencia del webhook de
 * WhatsApp, ingiere sincrónico (sin cola): el volumen es bajo, no hay un
 * sistema externo reintentando agresivamente, y necesita el `contact_id`
 * de inmediato para registrar el consentimiento (Ley 29733).
 */
export async function POST(request: Request): Promise<Response> {
  const ip = obtenerIp(request);
  const { permitido } = verificarRateLimit(`landing:${ip}`, LIMITE_RATE);
  if (!permitido) {
    return Response.json(
      { error: 'Demasiados envíos desde esta dirección. Intenta de nuevo más tarde.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = landingLeadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (esEnvioHoneypot(parsed.data)) {
    // 200 igual: revelar que se detectó el honeypot solo ayuda al bot a
    // ajustarse. Simplemente no se procesa nada.
    return Response.json({ ok: true });
  }

  const mensaje = normalizeLandingSubmission(parsed.data);
  const resultado = await ingestInboundMessage(mensaje);

  const { error: errorConsentimiento } = await supabaseAdmin().from('consents').insert({
    org_id: resultado.orgId,
    contact_id: resultado.contactId,
    canal: 'landing',
    texto_mostrado: parsed.data.texto_consentimiento,
    otorgado: true,
  });
  if (errorConsentimiento) {
    console.error('No se pudo registrar el consentimiento', errorConsentimiento);
  }

  return Response.json({ ok: true });
}
