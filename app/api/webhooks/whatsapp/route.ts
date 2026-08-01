import { after } from 'next/server';
import { envMetaWebhook } from '@/lib/env';
import { verifyMetaSignature } from '@/lib/channels/verify-signature';
import { normalizeWhatsappPayload } from '@/lib/channels/whatsapp';
import { enqueueInboundMessage } from '@/lib/queue/enqueue';
import { drenarCola } from '@/lib/queue/drain';

// Necesita runtime Node: verificación de firma HMAC sobre el body crudo.
export const runtime = 'nodejs';

/** Verificación del webhook al registrarlo en Meta for Developers. */
export async function GET(request: Request): Promise<Response> {
  const { META_WEBHOOK_VERIFY_TOKEN } = envMetaWebhook();
  const url = new URL(request.url);

  const modo = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (modo === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Verificación fallida', { status: 403 });
}

/**
 * Recibe mensajes entrantes de WhatsApp. Verifica la firma, normaliza y
 * encola — nada de trabajo de base de datos "pesado" antes de responder, así
 * Meta no reintenta el webhook por lentitud. `after()` dispara el drenado
 * inmediatamente después de responder, para no depender solo del minuto de
 * Vercel Cron.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const { META_APP_SECRET } = envMetaWebhook();
  const firma = request.headers.get('x-hub-signature-256');

  if (!verifyMetaSignature(rawBody, firma, META_APP_SECRET)) {
    return new Response('Firma inválida', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // JSON inválido: reintentar no lo va a arreglar. 200 para que Meta no insista.
    return new Response('OK', { status: 200 });
  }

  const mensajes = normalizeWhatsappPayload(payload);
  for (const msg of mensajes) {
    try {
      await enqueueInboundMessage(msg);
    } catch (error) {
      // No relanzar: que un mensaje falle al encolar no debe hacer que Meta
      // reintente todo el batch (y duplique los que sí se encolaron bien).
      console.error('Error al encolar mensaje de WhatsApp', error);
    }
  }

  if (mensajes.length > 0) {
    after(() =>
      drenarCola().catch((error: unknown) => console.error('Error al drenar', error)),
    );
  }

  return new Response('OK', { status: 200 });
}
