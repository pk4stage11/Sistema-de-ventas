import { describe, expect, it } from 'vitest';
import { normalizeWhatsappPayload } from '@/lib/channels/whatsapp';
import mensajeTexto from '../contract/fixtures/whatsapp-text-message.json';
import mensajeImagen from '../contract/fixtures/whatsapp-image-message.json';
import actualizacionEstado from '../contract/fixtures/whatsapp-status-update.json';

describe('normalizeWhatsappPayload', () => {
  it('normaliza un mensaje de texto real de Meta', () => {
    const [msg] = normalizeWhatsappPayload(mensajeTexto);

    expect(msg).toMatchObject({
      channel: 'whatsapp',
      external_contact_id: '51987654321',
      conversation_id: '109876543210:51987654321',
      direction: 'entrante',
      type: 'texto',
      text: 'Hola, me interesa el departamento en Miraflores',
      contact_name: 'María Rodríguez',
      message_external_id:
        'wamid.HBgLNTE5ODc2NTQzMjEVAgASGBQzQTdCOEY3RDQ2QzIxRUYzNTg4AA==',
    });
    expect(msg!.timestamp).toBe(new Date(1785500000 * 1000).toISOString());
  });

  it('normaliza un mensaje de imagen, con el caption como texto y el media_id conservado', () => {
    const [msg] = normalizeWhatsappPayload(mensajeImagen);

    expect(msg?.type).toBe('imagen');
    expect(msg?.text).toBe('¿Tienen algo parecido a esto?');
    expect(msg?.media).toEqual([
      {
        external_id: 'media-id-abc123',
        url: null,
        mime_type: 'image/jpeg',
        size: null,
        caption: '¿Tienen algo parecido a esto?',
      },
    ]);
  });

  it('ignora las actualizaciones de estado (delivered/read) — no son mensajes', () => {
    const mensajes = normalizeWhatsappPayload(actualizacionEstado);
    expect(mensajes).toEqual([]);
  });

  it('no lanza con un payload que no tiene la forma esperada', () => {
    expect(() => normalizeWhatsappPayload({ algo: 'inesperado' })).not.toThrow();
    expect(normalizeWhatsappPayload({ algo: 'inesperado' })).toEqual([]);
    expect(normalizeWhatsappPayload(null)).toEqual([]);
    expect(normalizeWhatsappPayload('texto plano')).toEqual([]);
  });

  it('el resultado pasa el propio inboundMessageSchema (Fase 0)', async () => {
    const { inboundMessageSchema } = await import('@/lib/channels/types');
    const [msg] = normalizeWhatsappPayload(mensajeTexto);
    expect(() => inboundMessageSchema.parse(msg)).not.toThrow();
  });
});
