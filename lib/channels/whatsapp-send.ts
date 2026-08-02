import { envWhatsappSend } from '@/lib/env';

const VERSION_GRAPH_API = 'v21.0';

export interface ResultadoEnvioWhatsapp {
  messageId: string;
}

/**
 * Envía un mensaje de texto libre por WhatsApp Cloud API. Solo funciona
 * dentro de la ventana de servicio de 24 h — fuera de ella, Meta rechaza
 * el envío y hay que usar una plantilla aprobada (gestión de plantillas:
 * Fase 5). Este helper no valida la ventana por su cuenta; quien lo llama
 * (lib/queue/drain.ts) decide si corresponde según el último mensaje
 * entrante.
 */
export async function enviarMensajeWhatsapp(
  telefono: string,
  texto: string,
): Promise<ResultadoEnvioWhatsapp> {
  const { WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN } = envWhatsappSend();

  const res = await fetch(
    `https://graph.facebook.com/${VERSION_GRAPH_API}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'text',
        text: { body: texto },
      }),
    },
  );

  if (!res.ok) {
    const cuerpo = await res.text();
    throw new Error(`WhatsApp Cloud API respondió ${res.status}: ${cuerpo}`);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return { messageId: data.messages?.[0]?.id ?? `sin-id-${Date.now()}` };
}
