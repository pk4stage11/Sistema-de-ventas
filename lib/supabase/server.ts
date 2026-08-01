import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { envPublic } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers: usa la anon key + la sesión del usuario (cookies), así que
 * respeta RLS igual que el navegador — a diferencia de
 * lib/supabase/admin.ts, que la bypassa a propósito.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublic();

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un Server Component (sin permiso de escritura de
            // cookies) en vez de una Server Action o Route Handler. No pasa
            // nada: el middleware ya se encarga de refrescar la sesión en
            // cada request.
          }
        },
      },
    },
  );
}
