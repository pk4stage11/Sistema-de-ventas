import { z } from 'zod';
import type { InboundMessage, Media, TipoMensaje } from '@/lib/channels/types';

/**
 * Adaptador de WhatsApp Cloud API: traduce el payload crudo del webhook a
 * `InboundMessage[]`. El resto del sistema nunca ve esta forma.
 *
 * El schema es deliberadamente laxo (no valida cada campo posible que Meta
 * puede mandar): solo se exige lo mínimo para ubicar los mensajes dentro del
 * árbol `entry[].changes[].value`. El payload íntegro igual se preserva en
 * `raw_payload` para auditoría, así que un campo no modelado aquí no se
 * pierde, simplemente no se usa todavía.
 */

const mensajeCrudoSchema = z
  .object({
    from: z.string(),
    id: z.string(),
    timestamp: z.string(),
    type: z.string(),
  })
  .catchall(z.unknown());

const valorWebhookSchema = z.object({
  metadata: z
    .object({ phone_number_id: z.string().optional() })
    .catchall(z.unknown())
    .optional(),
  contacts: z
    .array(
      z.object({
        wa_id: z.string(),
        profile: z.object({ name: z.string().optional() }).optional(),
      }),
    )
    .optional(),
  messages: z.array(mensajeCrudoSchema).optional(),
  // Meta también manda actualizaciones de estado (entregado/leído) por el
  // mismo webhook — no son mensajes entrantes, se ignoran explícitamente.
  statuses: z.array(z.unknown()).optional(),
});

const webhookWhatsappSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        changes: z.array(
          z.object({
            field: z.string().optional(),
            value: valorWebhookSchema,
          }),
        ),
      }),
    )
    .default([]),
});

const TIPO_POR_CAMPO_WHATSAPP: Record<string, TipoMensaje> = {
  text: 'texto',
  image: 'imagen',
  audio: 'audio',
  video: 'video',
  document: 'documento',
  location: 'ubicacion',
  contacts: 'contacto',
  sticker: 'sticker',
  system: 'sistema',
};

function extraerTextoYMedia(
  msg: z.infer<typeof mensajeCrudoSchema>,
  tipo: TipoMensaje,
): { text: string | null; media: Media[] } {
  if (tipo === 'texto') {
    const texto = msg as { text?: { body?: string } };
    return { text: texto.text?.body ?? null, media: [] };
  }

  if (tipo === 'ubicacion') {
    const loc = msg as {
      location?: {
        latitude?: number;
        longitude?: number;
        name?: string;
        address?: string;
      };
    };
    const partes = [loc.location?.name, loc.location?.address].filter(Boolean);
    const coords =
      loc.location?.latitude != null && loc.location?.longitude != null
        ? `(${loc.location.latitude}, ${loc.location.longitude})`
        : null;
    return { text: [...partes, coords].filter(Boolean).join(' ') || null, media: [] };
  }

  if (['imagen', 'audio', 'video', 'documento', 'sticker'].includes(tipo)) {
    const campo = Object.keys(TIPO_POR_CAMPO_WHATSAPP).find(
      (k) => TIPO_POR_CAMPO_WHATSAPP[k] === tipo,
    )!;
    const objetoMedia = (msg as Record<string, unknown>)[campo] as
      { id?: string; mime_type?: string; caption?: string } | undefined;
    if (!objetoMedia) return { text: null, media: [] };
    return {
      text: objetoMedia.caption ?? null,
      media: [
        {
          external_id: objetoMedia.id ?? null,
          url: null,
          mime_type: objetoMedia.mime_type ?? null,
          size: null,
          caption: objetoMedia.caption ?? null,
        },
      ],
    };
  }

  return { text: null, media: [] };
}

/**
 * Normaliza un payload de webhook de WhatsApp Cloud API. Devuelve un
 * `InboundMessage` por cada mensaje real; las actualizaciones de estado
 * (`statuses`) y los tipos que Meta agregue en el futuro sin que los
 * conozcamos se traducen a `no_soportado` en vez de perderse.
 */
export function normalizeWhatsappPayload(rawBody: unknown): InboundMessage[] {
  const parsed = webhookWhatsappSchema.safeParse(rawBody);
  if (!parsed.success) return [];

  const mensajes: InboundMessage[] = [];

  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      const { value } = change;
      if (!value.messages || value.messages.length === 0) continue;

      const phoneNumberId = value.metadata?.phone_number_id ?? 'desconocido';

      for (const msg of value.messages) {
        const tipo = TIPO_POR_CAMPO_WHATSAPP[msg.type] ?? 'no_soportado';
        const { text, media } = extraerTextoYMedia(msg, tipo);
        const contacto = value.contacts?.find((c) => c.wa_id === msg.from);

        mensajes.push({
          channel: 'whatsapp',
          external_contact_id: msg.from,
          // En WhatsApp el hilo coincide 1:1 con el número del contacto; se
          // incluye el phone_number_id para no mezclar hilos si algún día
          // hay más de un número de WhatsApp conectado a la misma org.
          conversation_id: `${phoneNumberId}:${msg.from}`,
          direction: 'entrante',
          type: tipo,
          text,
          media,
          timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
          message_external_id: msg.id,
          contact_name: contacto?.profile?.name ?? null,
          raw_payload: msg,
        });
      }
    }
  }

  return mensajes;
}
