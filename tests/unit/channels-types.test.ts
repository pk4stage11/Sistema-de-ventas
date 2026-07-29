import { describe, expect, it } from 'vitest';
import { inboundMessageSchema } from '@/lib/channels/types';

describe('inboundMessageSchema', () => {
  it('acepta un mensaje de texto normalizado válido', () => {
    const resultado = inboundMessageSchema.safeParse({
      channel: 'whatsapp',
      external_contact_id: '51987654321',
      conversation_id: '51987654321',
      direction: 'entrante',
      type: 'texto',
      text: 'Hola, busco un depa de 2 dormitorios en Miraflores',
      media: [],
      timestamp: '2026-07-29T15:00:00.000Z',
      message_external_id: 'wamid.ABC123',
      contact_name: 'Cristhian',
      raw_payload: { ejemplo: true },
    });

    expect(resultado.success).toBe(true);
  });

  it('rechaza un canal no soportado', () => {
    const resultado = inboundMessageSchema.safeParse({
      channel: 'tiktok',
      external_contact_id: '1',
      conversation_id: '1',
      direction: 'entrante',
      type: 'texto',
      text: 'hola',
      media: [],
      timestamp: '2026-07-29T15:00:00.000Z',
      message_external_id: 'x',
      contact_name: null,
      raw_payload: {},
    });

    expect(resultado.success).toBe(false);
  });

  it('exige message_external_id para poder garantizar idempotencia', () => {
    const resultado = inboundMessageSchema.safeParse({
      channel: 'whatsapp',
      external_contact_id: '1',
      conversation_id: '1',
      direction: 'entrante',
      type: 'texto',
      text: 'hola',
      media: [],
      timestamp: '2026-07-29T15:00:00.000Z',
      message_external_id: '',
      contact_name: null,
      raw_payload: {},
    });

    expect(resultado.success).toBe(false);
  });
});
