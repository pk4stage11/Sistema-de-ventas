import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envPublic, envSupabaseServer } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Cliente con `service_role`: bypassa RLS por completo. Solo para código de
 * servidor de confianza (webhooks, drenador de la cola, agente, scripts como
 * seed.ts) — nunca debe importarse desde un componente cliente. No se usa el
 * paquete `server-only` aquí a propósito: este módulo también lo consumen
 * scripts de Node ejecutados fuera del bundler de Next (tsx), donde
 * `server-only` siempre lanza. La protección en tiempo de ejecución la da
 * `envSupabaseServer()` (falla si `window` existe); dentro de la app Next,
 * las rutas y server actions que la usan deben vivir en runtime Node.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  const pub = envPublic();
  const { SUPABASE_SERVICE_ROLE_KEY } = envSupabaseServer();

  return createClient<Database>(
    pub.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
