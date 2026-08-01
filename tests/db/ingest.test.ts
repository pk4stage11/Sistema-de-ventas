import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { ingestInboundMessage } from '@/lib/channels/ingest';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { InboundMessage } from '@/lib/channels/types';

describe('ingestInboundMessage: idempotencia y creación de contacto/conversación', () => {
  const admin = supabaseAdmin();
  const telefonoUnico = `519${Math.floor(Math.random() * 100_000_000)}`;
  const externalId = `test-msg-${randomUUID()}`;

  const mensaje: InboundMessage = {
    channel: 'whatsapp',
    external_contact_id: telefonoUnico,
    conversation_id: `simulado:${telefonoUnico}`,
    direction: 'entrante',
    type: 'texto',
    text: 'Mensaje de prueba de idempotencia',
    media: [],
    timestamp: new Date().toISOString(),
    message_external_id: externalId,
    contact_name: 'Contacto de Prueba Ingest',
    raw_payload: { prueba: true },
  };

  let contactId: string;
  let conversationId: string;
  const messageIds: string[] = [];

  afterAll(async () => {
    if (messageIds.length > 0)
      await admin.from('messages').delete().in('id', messageIds);
    if (conversationId)
      await admin.from('conversations').delete().eq('id', conversationId);
    if (contactId) await admin.from('contacts').delete().eq('id', contactId);
    // El canal "whatsapp" que resuelve/crea no se borra: es infraestructura
    // real que la app necesita de todos modos, no un artefacto del test.
  });

  it('crea contacto, conversación y mensaje la primera vez', async () => {
    const resultado = await ingestInboundMessage(mensaje);

    expect(resultado.duplicado).toBe(false);
    expect(resultado.messageId).not.toBeNull();
    contactId = resultado.contactId;
    conversationId = resultado.conversationId;
    if (resultado.messageId) messageIds.push(resultado.messageId);

    const { data: contacto } = await admin
      .from('contacts')
      .select('full_name, phone')
      .eq('id', contactId)
      .single();
    expect(contacto?.full_name).toBe('Contacto de Prueba Ingest');
    expect(contacto?.phone).toBe(telefonoUnico);
  });

  it('el mismo message_external_id no crea un segundo mensaje (Meta reintenta el webhook)', async () => {
    const resultado = await ingestInboundMessage(mensaje);

    expect(resultado.duplicado).toBe(true);
    expect(resultado.contactId).toBe(contactId);
    expect(resultado.conversationId).toBe(conversationId);

    const { data: mensajes } = await admin
      .from('messages')
      .select('id')
      .eq('message_external_id', externalId);
    expect(mensajes).toHaveLength(1);
  });

  it('un segundo mensaje del mismo contacto reutiliza el mismo contacto y conversación', async () => {
    const segundoMensaje: InboundMessage = {
      ...mensaje,
      text: 'Segundo mensaje del mismo contacto',
      message_external_id: `${externalId}-2`,
    };
    const resultado = await ingestInboundMessage(segundoMensaje);

    expect(resultado.contactId).toBe(contactId);
    expect(resultado.conversationId).toBe(conversationId);
    if (resultado.messageId) messageIds.push(resultado.messageId);
  });
});
