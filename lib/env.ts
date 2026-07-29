import { z } from 'zod';

/**
 * Validación de variables de entorno.
 *
 * Las variables del servidor se validan de forma perezosa (al primer uso) para
 * que el build no falle en un entorno que todavía no tiene todos los secretos.
 * Nada de `SUPABASE_SERVICE_ROLE_KEY` ni tokens de Meta debe llegar al cliente:
 * solo las `NEXT_PUBLIC_*` son visibles en el navegador.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-'),

  // Meta (Fases 2 y 5)
  META_APP_SECRET: z.string().min(1),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),

  // Google Calendar (Fase 4.5) — una sola cuenta de la empresa
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),

  // Clave de cifrado del refresh token de Google guardado en la base
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'Debe ser una clave de 32 bytes en hexadecimal (64 caracteres)'),

  // Protege /api/cron/drain de invocaciones externas
  CRON_SECRET: z.string().min(16),
});

export const envPublicSchema = publicSchema;
export const envServerSchema = serverSchema;

export type EnvPublic = z.infer<typeof publicSchema>;
export type EnvServer = z.infer<typeof serverSchema>;

function formatearError(error: z.ZodError): string {
  const detalles = error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  return `Variables de entorno inválidas o faltantes:\n${detalles}\n\nRevisa .env.example y tu archivo .env.local.`;
}

let cachePublic: EnvPublic | null = null;
let cacheServer: EnvServer | null = null;

/** Variables públicas. Seguras de usar en el cliente. */
export function envPublic(): EnvPublic {
  if (cachePublic) return cachePublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) throw new Error(formatearError(parsed.error));
  cachePublic = parsed.data;
  return cachePublic;
}

/** Variables del servidor. Lanza si se invoca desde el navegador. */
export function envServer(): EnvServer {
  if (typeof window !== 'undefined') {
    throw new Error(
      'envServer() se invocó en el cliente. Los secretos nunca deben llegar al navegador.',
    );
  }
  if (cacheServer) return cacheServer;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(formatearError(parsed.error));
  cacheServer = parsed.data;
  return cacheServer;
}

/** Utilidad para tests: descarta la caché entre casos. */
export function _limpiarCacheEnv(): void {
  cachePublic = null;
  cacheServer = null;
}
