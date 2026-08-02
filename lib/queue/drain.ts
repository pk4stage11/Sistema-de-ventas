import { supabaseAdmin } from '@/lib/supabase/admin';
import { ingestInboundMessage } from '@/lib/channels/ingest';
import { inboundMessageSchema } from '@/lib/channels/types';
import { runAgentTurn } from '@/lib/agent/run';
import { enviarMensajeWhatsapp } from '@/lib/channels/whatsapp-send';
import { horasDesde } from '@/lib/format/relative-time';

const LOTE_POR_DEFECTO = 20;
const BACKOFF_BASE_MS = 60_000; // 1 min
const BACKOFF_TOPE_MS = 30 * 60_000; // 30 min
const VENTANA_WHATSAPP_HORAS = 24;

export interface ResultadoDrenado {
  procesados: number;
  fallidos: number;
  duplicados: number;
}

/**
 * Después de ingerir un mensaje de WhatsApp con la IA activa, corre el
 * agente y — si respondió algo y la ventana de servicio de 24h sigue
 * abierta — se lo envía de vuelta al cliente. La respuesta se guarda como
 * mensaje SIEMPRE, aunque el envío real falle (p. ej. sin credenciales de
 * WhatsApp configuradas todavía): así queda visible en la bandeja de
 * todos modos, y el fallo de envío no tumba el job.
 */
async function correrAgenteYResponder(
  db: ReturnType<typeof supabaseAdmin>,
  conversationId: string,
): Promise<void> {
  const { data: conversacion } = await db
    .from('conversations')
    .select('id, org_id, contact_id, ia_activa, channels(type)')
    .eq('id', conversationId)
    .single();
  if (!conversacion || !conversacion.ia_activa) return;

  const canal = conversacion.channels as unknown as { type: string } | null;
  if (canal?.type !== 'whatsapp') return; // por ahora el agente solo responde por WhatsApp

  const turno = await runAgentTurn(conversationId);
  if (!turno.respuesta) return;

  const { data: mensajeSalida, error: errorInsert } = await db
    .from('messages')
    .insert({
      org_id: conversacion.org_id,
      conversation_id: conversationId,
      direction: 'saliente',
      sender_type: 'ia',
      type: 'texto',
      text: turno.respuesta,
      message_external_id: `agente-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (errorInsert) throw errorInsert;

  await db
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  const { data: ultimoEntrante } = await db
    .from('messages')
    .select('timestamp')
    .eq('conversation_id', conversationId)
    .eq('direction', 'entrante')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ventanaAbierta =
    !ultimoEntrante || horasDesde(ultimoEntrante.timestamp) < VENTANA_WHATSAPP_HORAS;
  if (!ventanaAbierta) {
    console.warn(
      `Ventana de 24h cerrada para la conversación ${conversationId}; respuesta guardada pero no enviada (falta gestión de plantillas, Fase 5).`,
    );
    return;
  }

  const { data: contacto } = await db
    .from('contacts')
    .select('phone')
    .eq('id', conversacion.contact_id)
    .single();
  if (!contacto?.phone) return;

  try {
    await enviarMensajeWhatsapp(contacto.phone, turno.respuesta);
  } catch (error) {
    // No relanzar: el mensaje ya quedó guardado y visible en la bandeja.
    // Un fallo de envío (p. ej. credenciales de WhatsApp sin configurar
    // todavía) no debe marcar como fallido el job de ingesta completo.
    console.error(
      `No se pudo enviar la respuesta del agente por WhatsApp (mensaje ${mensajeSalida.id})`,
      error,
    );
  }
}

/**
 * Procesa un lote de la cola (`dequeue_jobs`, ver la migración
 * 20260801010000): por ahora solo hay jobs `procesar_mensaje`, así que cada
 * uno se ingiere (contacto + conversación + mensaje) y, si corresponde,
 * dispara al agente. El backoff es exponencial y tope 30 min; al agotar
 * `max_intentos` el job queda en `fallido` para revisión manual en vez de
 * reintentar para siempre.
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

      // El job se marca completado apenas la INGESTA está a salvo — un
      // fallo del agente después de esto (p. ej. credenciales de
      // Anthropic inválidas) no debe hacer que el job se reintente: el
      // mensaje ya quedó guardado, y reintentar ingestInboundMessage solo
      // encontraría un duplicado y ni siquiera volvería a intentar
      // correrAgenteYResponder.
      await db
        .from('job_queue')
        .update({ estado: 'completado', procesado_en: new Date().toISOString() })
        .eq('id', job.id);

      if (!resultado.duplicado) {
        try {
          await correrAgenteYResponder(db, resultado.conversationId);
        } catch (errorAgente) {
          console.error(
            `El agente falló para la conversación ${resultado.conversationId}`,
            errorAgente,
          );
        }
      }
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
