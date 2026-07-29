import { z } from 'zod';

/**
 * Modelo normalizado de mensaje entrante.
 *
 * Es el único contrato que la lógica de negocio conoce: el agente, la cola y la
 * bandeja nunca deben saber de qué canal viene un mensaje. Cada adaptador de
 * canal (`lib/channels/*.ts`) traduce su payload crudo a esta forma.
 */

export const CANALES = ['whatsapp', 'messenger', 'instagram', 'landing'] as const;
export type Canal = (typeof CANALES)[number];

export const TIPOS_MENSAJE = [
  'texto',
  'imagen',
  'audio',
  'video',
  'documento',
  'ubicacion',
  'contacto',
  'sticker',
  'sistema',
  'no_soportado',
] as const;
export type TipoMensaje = (typeof TIPOS_MENSAJE)[number];

export const mediaSchema = z.object({
  /** Identificador del archivo en la API del canal, para descargarlo después. */
  external_id: z.string().nullable(),
  /** URL ya resuelta o guardada en Supabase Storage, si existe. */
  url: z.string().nullable(),
  mime_type: z.string().nullable(),
  /** Tamaño en bytes cuando el canal lo informa. */
  size: z.number().int().nonnegative().nullable(),
  /** Texto alternativo o pie de foto. */
  caption: z.string().nullable(),
});
export type Media = z.infer<typeof mediaSchema>;

export const inboundMessageSchema = z.object({
  channel: z.enum(CANALES),
  /** Identidad del contacto en el canal: teléfono E.164, PSID o IGSID. */
  external_contact_id: z.string().min(1),
  /** Hilo en el canal. En WhatsApp coincide con el contacto; en Meta es el thread. */
  conversation_id: z.string().min(1),
  direction: z.enum(['entrante', 'saliente']),
  type: z.enum(TIPOS_MENSAJE),
  /** Texto plano del mensaje, o el pie de foto si es multimedia. */
  text: z.string().nullable(),
  media: z.array(mediaSchema).default([]),
  /** Momento del evento en el canal, no el de recepción. ISO 8601 en UTC. */
  timestamp: z.string().datetime({ offset: true }),
  /**
   * Identificador del mensaje en el canal. Es la clave de idempotencia:
   * Meta reintenta los webhooks y no debemos duplicar mensajes.
   */
  message_external_id: z.string().min(1),
  /** Nombre visible que el canal reporta, si lo hay. */
  contact_name: z.string().nullable(),
  /** Payload íntegro tal como llegó, para auditoría y depuración. */
  raw_payload: z.unknown(),
});

export type InboundMessage = z.infer<typeof inboundMessageSchema>;

/** Mensaje a enviar por un canal. La guarda de ventana se aplica antes de esto. */
export interface OutboundMessage {
  channel: Canal;
  external_contact_id: string;
  text: string;
  /** Cuando la ventana de servicio está cerrada solo se permite plantilla. */
  template?: {
    name: string;
    language: string;
    variables: string[];
  };
}
