import { supabaseAdmin } from '@/lib/supabase/admin';
import { getDefaultOrgId } from '@/lib/org/default-org';
import type { InboundMessage } from '@/lib/channels/types';

export interface ResultadoEncolado {
  /** true si ya había un job para este message_external_id (reintento de Meta). */
  duplicado: boolean;
}

/**
 * Encola un mensaje entrante para que el drenador lo procese
 * (lib/queue/drain.ts). Es deliberadamente la única operación que hace el
 * webhook antes de responder — Meta reintenta el webhook si tarda o no
 * responde 200, así que el trabajo real de ingesta (contacto, conversación,
 * mensaje) se hace después, fuera del ciclo de vida de esa request.
 */
export async function enqueueInboundMessage(
  msg: InboundMessage,
): Promise<ResultadoEncolado> {
  const db = supabaseAdmin();
  const orgId = await getDefaultOrgId();

  const { error } = await db.from('job_queue').insert({
    org_id: orgId,
    tipo: 'procesar_mensaje',
    payload: msg as never,
    message_external_id: msg.message_external_id,
  });

  if (error) {
    if (error.code === '23505') return { duplicado: true };
    throw error;
  }
  return { duplicado: false };
}
