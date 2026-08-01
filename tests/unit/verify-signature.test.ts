import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMetaSignature } from '@/lib/channels/verify-signature';

const SECRETO = 'un-secreto-de-prueba';

function firmar(body: string, secreto = SECRETO): string {
  return `sha256=${createHmac('sha256', secreto).update(body, 'utf8').digest('hex')}`;
}

describe('verifyMetaSignature', () => {
  it('acepta una firma válida', () => {
    const body = JSON.stringify({ hola: 'mundo' });
    expect(verifyMetaSignature(body, firmar(body), SECRETO)).toBe(true);
  });

  it('rechaza cuando el body fue alterado después de firmar', () => {
    const body = JSON.stringify({ hola: 'mundo' });
    const firma = firmar(body);
    const bodyAlterado = JSON.stringify({ hola: 'mundo-alterado' });
    expect(verifyMetaSignature(bodyAlterado, firma, SECRETO)).toBe(false);
  });

  it('rechaza una firma calculada con otro secreto', () => {
    const body = JSON.stringify({ hola: 'mundo' });
    expect(verifyMetaSignature(body, firmar(body, 'otro-secreto'), SECRETO)).toBe(
      false,
    );
  });

  it('rechaza si no hay header de firma', () => {
    expect(verifyMetaSignature('{}', null, SECRETO)).toBe(false);
  });

  it('rechaza un header sin el prefijo sha256=', () => {
    const body = '{}';
    const hashCrudo = createHmac('sha256', SECRETO).update(body).digest('hex');
    expect(verifyMetaSignature(body, hashCrudo, SECRETO)).toBe(false);
  });

  it('rechaza una firma truncada sin lanzar una excepción', () => {
    const body = '{}';
    expect(() => verifyMetaSignature(body, 'sha256=abc123', SECRETO)).not.toThrow();
    expect(verifyMetaSignature(body, 'sha256=abc123', SECRETO)).toBe(false);
  });
});
