/**
 * Rate limiting por ventana fija, en memoria del proceso.
 *
 * Deliberadamente simple para esta etapa (bootstrapped, tráfico bajo): no
 * requiere Redis/Upstash ni ningún servicio pago. La limitación real es que
 * el estado vive por instancia serverless — en Vercel, con varias instancias
 * concurrentes, el límite efectivo es "N intentos por IP por instancia", no
 * un límite global estricto. Si el formulario empieza a recibir spam en
 * volumen, migrar a Upstash Redis (tiene free tier) es el siguiente paso, no
 * antes.
 */

interface Contador {
  intentos: number;
  reinicioEn: number;
}

const contadores = new Map<string, Contador>();

export interface ResultadoRateLimit {
  permitido: boolean;
  restantes: number;
}

export function verificarRateLimit(
  clave: string,
  { maxIntentos, ventanaMs }: { maxIntentos: number; ventanaMs: number },
): ResultadoRateLimit {
  const ahora = Date.now();
  const actual = contadores.get(clave);

  if (!actual || ahora >= actual.reinicioEn) {
    contadores.set(clave, { intentos: 1, reinicioEn: ahora + ventanaMs });
    return { permitido: true, restantes: maxIntentos - 1 };
  }

  if (actual.intentos >= maxIntentos) {
    return { permitido: false, restantes: 0 };
  }

  actual.intentos += 1;
  return { permitido: true, restantes: maxIntentos - actual.intentos };
}
