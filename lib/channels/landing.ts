import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { InboundMessage } from '@/lib/channels/types';

/**
 * Formulario de landing. A diferencia de WhatsApp, el canal no manda un
 * identificador de mensaje propio ni firma nada — la protección acá es
 * validación estricta de forma (Zod), rate limiting (lib/security/rate-limit.ts)
 * y un honeypot.
 *
 * `sitio_web` es el campo honeypot: un input oculto en el formulario real
 * que una persona nunca completa pero un bot de envío automático sí. Se
 * acepta cualquier valor a nivel de schema (no se rechaza aquí) para que la
 * ruta pueda responder 200 igual y descartar en silencio — devolver un error
 * le confirmaría al bot que fue detectado.
 */
export const landingLeadSchema = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    telefono: z.string().trim().min(6).max(20).optional(),
    email: z.string().trim().email().optional(),
    mensaje: z.string().trim().max(2000).optional(),
    proyecto_interes: z.string().trim().max(200).optional(),
    // Consentimiento explícito (Ley 29733): debe venir marcado, y se guarda
    // el texto exacto que la persona vio para el registro de auditoría.
    consiente: z.literal(true),
    texto_consentimiento: z.string().trim().min(10).max(1000),
    sitio_web: z.string().optional(),
  })
  .refine((d) => Boolean(d.telefono ?? d.email), {
    message: 'Debe indicar al menos un teléfono o un correo de contacto',
    path: ['telefono'],
  });

export type LandingLead = z.infer<typeof landingLeadSchema>;

export function esEnvioHoneypot(data: LandingLead): boolean {
  return Boolean(data.sitio_web && data.sitio_web.trim() !== '');
}

export function normalizeLandingSubmission(data: LandingLead): InboundMessage {
  const identidad = data.telefono ?? data.email!;
  const partes = [
    data.mensaje,
    data.proyecto_interes ? `Interés: ${data.proyecto_interes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    channel: 'landing',
    external_contact_id: identidad,
    conversation_id: identidad,
    direction: 'entrante',
    type: 'texto',
    text: partes || null,
    media: [],
    timestamp: new Date().toISOString(),
    message_external_id: `landing:${randomUUID()}`,
    contact_name: data.nombre,
    raw_payload: data,
  };
}
