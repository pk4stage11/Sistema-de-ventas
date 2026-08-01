import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Prueba la ruta directamente (sin servidor HTTP corriendo): un route
 * handler de Next.js es solo una función `(Request) => Response`. Solo
 * cubre los caminos que NO llegan a `after()` (que necesita el contexto de
 * request real de Next) — el camino feliz completo se prueba con
 * scripts/simulate-webhook.ts contra `npm run dev`.
 */
describe('webhook de WhatsApp — GET (verificación) y rechazo de firma', () => {
  beforeAll(() => {
    process.env.META_APP_SECRET = 'secreto-de-test';
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'token-de-test';
  });

  it('GET responde el hub.challenge cuando el modo y el token coinciden', async () => {
    const { GET } = await import('@/app/api/webhooks/whatsapp/route');
    const url =
      'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=token-de-test&hub.challenge=abc123';
    const res = await GET(new Request(url));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abc123');
  });

  it('GET responde 403 si el verify_token no coincide', async () => {
    const { GET } = await import('@/app/api/webhooks/whatsapp/route');
    const url =
      'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=abc123';
    const res = await GET(new Request(url));

    expect(res.status).toBe(403);
  });

  it('POST responde 401 si la firma no coincide con el body', async () => {
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const res = await POST(
      new Request('http://localhost/api/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'x-hub-signature-256':
            'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: JSON.stringify({ entry: [] }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it('POST responde 401 si no viene ningún header de firma', async () => {
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const res = await POST(
      new Request('http://localhost/api/webhooks/whatsapp', {
        method: 'POST',
        body: JSON.stringify({ entry: [] }),
      }),
    );

    expect(res.status).toBe(401);
  });
});
