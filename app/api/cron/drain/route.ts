import { envCron } from '@/lib/env';
import { drenarCola } from '@/lib/queue/drain';

// Necesita runtime Node: usa el cliente admin de Supabase y lógica de
// negocio que no corre en Edge.
export const runtime = 'nodejs';

/**
 * Disparado por Vercel Cron cada minuto (configuración de despliegue, Fase
 * 7) más un disparo inmediato desde el webhook tras encolar, para bajar la
 * latencia del minuto de cron. Protegido con CRON_SECRET — Vercel Cron lo
 * manda como `Authorization: Bearer <CRON_SECRET>` automáticamente.
 */
export async function POST(request: Request): Promise<Response> {
  const { CRON_SECRET } = envCron();
  const auth = request.headers.get('authorization');

  if (auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('No autorizado', { status: 401 });
  }

  const resultado = await drenarCola();
  return Response.json(resultado);
}
