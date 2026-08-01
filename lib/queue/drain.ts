import { supabaseAdmin } from '@/lib/supabase/admin';
import { ingestInboundMessage } from '@/lib/channels/ingest';
import { inboundMessageSchema } from '@/lib/channels/types';

const LOTE_POR_DEFECTO = 20;
const BACKOFF_BASE_MS = 60_000; // 1 min
const BACKOFF_TOPE_MS = 30 * 60_000; // 30 min

export interface ResultadoDrenado {
  procesados: number;
  fallidos: number;
  duplicados: number;
}

/**
 * Procesa un lote de la cola (`dequeue_jobs`, ver la migración
 * 20260801010000): por ahora solo hay jobs `procesar_mensaje`, así que cada
 * uno se ingiere (contacto + conversación + mensaje). El backoff es
 * exponencial y tope 30 min; al agotar `max_intentos` el job queda en
 * `fallido` para revisión manual en vez de reintentar para siempre.
 */
export async function drenarCola(lote = LOTE_POR_DEFECTO): Promise<ResultadoDrenado> {
  const db = supabaseAdmin();

  const { data: jobs, error: errorDequeue } = await db.rpc('dequeue_jobs', {
    p_lote: lote,
  });
  if (errorDequeue) throw errorDequeue;
  if (!jobs || jobs.length === 0) return { procesados: 0, fallidos: 0, duplicados: 0 };

  let procesados = 0;
  let fallidos = 0;
  let duplicados = 0;

  for (const job of jobs) {
    try {
      if (job.tipo !== 'procesar_mensaje') {
        // Los otros tipos (enviar_recordatorio, sincronizar_calendario) se
        // implementan en fases posteriores; por ahora se descartan sin error.
        await db
          .from('job_queue')
          .update({ estado: 'completado', procesado_en: new Date().toISOString() })
          .eq('id', job.id);
        continue;
      }

      const mensaje = inboundMessageSchema.parse(job.payload);
      const resultado = await ingestInboundMessage(mensaje);
      if (resultado.duplicado) duplicados++;
      else procesados++;

      await db
        .from('job_queue')
        .update({ estado: 'completado', procesado_en: new Date().toISOString() })
        .eq('id', job.id);
    } catch (error) {
      fallidos++;
      const intentos = job.intentos + 1;
      const agotado = intentos >= job.max_intentos;
      const backoffMs = Math.min(BACKOFF_BASE_MS * 2 ** intentos, BACKOFF_TOPE_MS);

      await db
        .from('job_queue')
        .update({
          estado: agotado ? 'fallido' : 'pendiente',
          intentos,
          error: error instanceof Error ? error.message : String(error),
          disponible_en: agotado
            ? job.disponible_en
            : new Date(Date.now() + backoffMs).toISOString(),
        })
        .eq('id', job.id);
    }
  }

  return { procesados, fallidos, duplicados };
}
