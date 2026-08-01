/**
 * Simula un webhook de WhatsApp Cloud API firmado como lo haría Meta, para
 * probar el pipeline de ingesta completo (firma → normalización → cola →
 * drenado) sin depender de una app real de Meta. Requiere el dev server
 * corriendo (`npm run dev`) y las mismas credenciales que usa el servidor.
 *
 * Uso:
 *   npx tsx scripts/simulate-webhook.ts "Hola, busco un depa de 2 dormitorios en Miraflores"
 *   npx tsx scripts/simulate-webhook.ts "Hola" 51987654321
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createHmac, randomUUID } from 'node:crypto';

const URL_BASE = process.env.SIMULATE_WEBHOOK_URL ?? 'http://localhost:3000';

function construirPayload(texto: string, telefono: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba-simulada',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: telefono,
                phone_number_id: 'simulado-123',
              },
              contacts: [{ profile: { name: 'Cliente de prueba' }, wa_id: telefono }],
              messages: [
                {
                  from: telefono,
                  id: `wamid.simulado.${randomUUID()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: texto },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function main() {
  const texto = process.argv[2] ?? 'Hola, busco un depa de 2 dormitorios en Miraflores';
  const telefono = process.argv[3] ?? '51987654321';

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) throw new Error('Falta META_APP_SECRET en .env.local');

  const body = JSON.stringify(construirPayload(texto, telefono));
  const firma = `sha256=${createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')}`;

  console.log(`Enviando mensaje simulado de ${telefono}: "${texto}"`);
  console.log(`  POST ${URL_BASE}/api/webhooks/whatsapp`);

  const res = await fetch(`${URL_BASE}/api/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': firma },
    body,
  });

  console.log(`  Respuesta: ${res.status} ${await res.text()}`);
  if (!res.ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error('Falló la simulación:', error);
  process.exitCode = 1;
});
