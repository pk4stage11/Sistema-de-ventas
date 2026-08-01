import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifica la firma `X-Hub-Signature-256` que Meta envía en cada webhook
 * (WhatsApp Cloud API / Messenger / Instagram comparten el mismo esquema):
 * HMAC-SHA256 del body crudo con el App Secret, como `sha256=<hex>`.
 *
 * Debe calcularse sobre el body **crudo** (antes de cualquier JSON.parse) —
 * un solo espacio de diferencia en el re-serializado invalida la firma.
 * La comparación es en tiempo constante para no filtrar por timing cuánto
 * del hash coincide.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;

  const [scheme, firmaRecibida] = signatureHeader.split('=');
  if (scheme !== 'sha256' || !firmaRecibida) return false;

  const firmaEsperada = createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const bufferRecibido = Buffer.from(firmaRecibida, 'hex');
  const bufferEsperado = Buffer.from(firmaEsperada, 'hex');

  // timingSafeEqual lanza si los buffers tienen distinto largo — una firma
  // truncada o mal formada no debe crashear el handler, solo ser inválida.
  if (bufferRecibido.length !== bufferEsperado.length) return false;

  return timingSafeEqual(bufferRecibido, bufferEsperado);
}
