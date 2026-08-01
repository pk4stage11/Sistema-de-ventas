import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Canal } from '@/lib/channels/types';

const NOMBRE_POR_DEFECTO: Record<Canal, string> = {
  whatsapp: 'WhatsApp',
  landing: 'Formulario web',
  messenger: 'Messenger',
  instagram: 'Instagram',
};

/**
 * Encuentra el canal configurado de este tipo para la organización, o lo
 * crea si es la primera vez que llega un mensaje por ahí. Evita tener que
 * precargar filas de `channels` a mano antes de poder recibir mensajes.
 */
export async function resolveChannel(
  orgId: string,
  type: Canal,
  externalId?: string | null,
): Promise<string> {
  const db = supabaseAdmin();

  const { data: existentes, error: errorBusqueda } = await db
    .from('channels')
    .select('id')
    .eq('org_id', orgId)
    .eq('type', type)
    .limit(1);
  if (errorBusqueda) throw errorBusqueda;
  const existente = existentes?.[0];
  if (existente) return existente.id;

  const { data: creado, error: errorCreacion } = await db
    .from('channels')
    .insert({
      org_id: orgId,
      type,
      name: NOMBRE_POR_DEFECTO[type],
      external_id: externalId ?? null,
    })
    .select('id')
    .single();
  if (errorCreacion || !creado)
    throw errorCreacion ?? new Error('No se pudo crear el canal');
  return creado.id;
}
