import type { PostgrestError } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getDefaultOrgId } from '@/lib/org/default-org';
import { resolveChannel } from '@/lib/channels/resolve-channel';
import type { InboundMessage } from '@/lib/channels/types';

export interface ResultadoIngesta {
  /** true si el mensaje ya existía (Meta reintentó el webhook) — no es un error. */
  duplicado: boolean;
  orgId: string;
  contactId: string;
  conversationId: string;
  messageId: string | null;
}

const CODIGO_VIOLACION_UNICIDAD = '23505';

function esViolacionDeUnicidad(error: PostgrestError): boolean {
  return error.code === CODIGO_VIOLACION_UNICIDAD;
}

async function resolverContacto(
  db: ReturnType<typeof supabaseAdmin>,
  orgId: string,
  msg: InboundMessage,
): Promise<string> {
  const { data: existentes, error: errorBusqueda } = await db
    .from('contacts')
    .select('id, full_name')
    .eq('org_id', orgId)
    .eq(`external_ids->>${msg.channel}`, msg.external_contact_id)
    .limit(1);
  if (errorBusqueda) throw errorBusqueda;
  const existente = existentes?.[0];

  if (existente) {
    // Si antes no teníamos nombre y este mensaje sí lo trae, se completa.
    if (!existente.full_name && msg.contact_name) {
      await db
        .from('contacts')
        .update({ full_name: msg.contact_name })
        .eq('id', existente.id);
    }
    return existente.id;
  }

  const esEmail = msg.external_contact_id.includes('@');
  const { data: creado, error: errorCreacion } = await db
    .from('contacts')
    .insert({
      org_id: orgId,
      full_name: msg.contact_name,
      phone: esEmail ? null : msg.external_contact_id,
      email: esEmail ? msg.external_contact_id : null,
      external_ids: { [msg.channel]: msg.external_contact_id },
      source: msg.channel,
    })
    .select('id')
    .single();
  if (errorCreacion || !creado)
    throw errorCreacion ?? new Error('No se pudo crear el contacto');
  return creado.id;
}

async function resolverConversacion(
  db: ReturnType<typeof supabaseAdmin>,
  orgId: string,
  channelId: string,
  contactId: string,
  msg: InboundMessage,
): Promise<string> {
  const { data: existentes, error: errorBusqueda } = await db
    .from('conversations')
    .select('id')
    .eq('org_id', orgId)
    .eq('channel_id', channelId)
    .eq('external_thread_id', msg.conversation_id)
    .limit(1);
  if (errorBusqueda) throw errorBusqueda;
  const existente = existentes?.[0];
  if (existente) return existente.id;

  const { data: creada, error: errorCreacion } = await db
    .from('conversations')
    .insert({
      org_id: orgId,
      contact_id: contactId,
      channel_id: channelId,
      external_thread_id: msg.conversation_id,
    })
    .select('id')
    .single();
  if (errorCreacion || !creada) {
    throw errorCreacion ?? new Error('No se pudo crear la conversación');
  }
  return creada.id;
}

/**
 * Punto de entrada único de ingesta, sin importar el canal: resuelve
 * contacto y conversación (creándolos si es la primera vez) e inserta el
 * mensaje de forma idempotente por `message_external_id`.
 *
 * No encola nada — quien encola es responsabilidad de quien llama:
 * el webhook de WhatsApp encola primero y esta función la ejecuta después
 * el drenador (para responder rápido a Meta, que reintenta agresivamente);
 * el endpoint de landing la llama directo, sin cola, porque necesita el
 * `contact_id` de inmediato para registrar el consentimiento.
 */
export async function ingestInboundMessage(
  msg: InboundMessage,
): Promise<ResultadoIngesta> {
  const db = supabaseAdmin();
  const orgId = await getDefaultOrgId();
  const channelId = await resolveChannel(orgId, msg.channel);
  const contactId = await resolverContacto(db, orgId, msg);
  const conversationId = await resolverConversacion(
    db,
    orgId,
    channelId,
    contactId,
    msg,
  );

  const { data: mensaje, error: errorMensaje } = await db
    .from('messages')
    .insert({
      org_id: orgId,
      conversation_id: conversationId,
      direction: msg.direction,
      sender_type: 'contacto',
      type: msg.type,
      text: msg.text,
      media: msg.media,
      message_external_id: msg.message_external_id,
      timestamp: msg.timestamp,
      raw_payload: msg.raw_payload as never,
    })
    .select('id')
    .single();

  if (errorMensaje) {
    if (esViolacionDeUnicidad(errorMensaje)) {
      return { duplicado: true, orgId, contactId, conversationId, messageId: null };
    }
    throw errorMensaje;
  }

  await db
    .from('conversations')
    .update({ last_message_at: msg.timestamp })
    .eq('id', conversationId);

  return { duplicado: false, orgId, contactId, conversationId, messageId: mensaje.id };
}
