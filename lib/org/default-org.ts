import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * La plataforma opera con una sola organización por ahora (ver
 * docs/decisiones.md). Los webhooks y el formulario de landing no traen
 * ninguna sesión de usuario de la que derivar el `org_id`, así que resuelven
 * contra la única fila de `organizations` que existe.
 *
 * Cacheado en memoria del proceso: el id de la organización no cambia
 * durante la vida de una instancia serverless, y evita un round-trip a la
 * base en cada webhook.
 */
let orgIdCacheado: string | null = null;

export async function getDefaultOrgId(): Promise<string> {
  if (orgIdCacheado) return orgIdCacheado;

  const db = supabaseAdmin();
  const { data, error } = await db.from('organizations').select('id').limit(1);
  if (error) throw error;
  const primera = data?.[0];
  if (!primera) {
    throw new Error(
      'No hay ninguna organización creada todavía. Corre `npm run db:seed` primero.',
    );
  }

  orgIdCacheado = primera.id;
  return orgIdCacheado;
}
