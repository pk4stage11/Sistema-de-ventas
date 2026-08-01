'use client';

import { createBrowserClient } from '@supabase/ssr';
import { envPublic } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Cliente de Supabase para Client Components: sesión del navegador vía
 * cookies, respeta RLS. Es el que usan las suscripciones de Realtime
 * (lib/supabase/server.ts no sirve para eso — Realtime corre en el
 * navegador).
 */
export function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublic();
  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
