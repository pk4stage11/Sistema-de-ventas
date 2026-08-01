import { z } from 'zod';

/**
 * Validación de variables de entorno, agrupadas por área.
 *
 * Cada grupo se valida por separado y de forma perezosa (al primer uso): un
 * script que solo necesita Supabase (p. ej. scripts/seed.ts) no debe fallar
 * porque todavía no hay credenciales de Meta o de Google Calendar. Nada de
 * `SUPABASE_SERVICE_ROLE_KEY` ni tokens de Meta debe llegar al cliente: solo
 * las `NEXT_PUBLIC_*` son visibles en el navegador.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const supabaseServerSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const anthropicSchema = z.object({
  ANTHROPIC_API_KEY: z.string().startsWith('sk-'),
});

// Meta (Fases 2 y 5)
const metaSchema = z.object({
  META_APP_SECRET: z.string().min(1),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
});

// Google Calendar (Fase 4.5) — una sola cuenta de la empresa
const googleCalendarSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  // Clave de cifrado del refresh token de Google guardado en la base
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'Debe ser una clave de 32 bytes en hexadecimal (64 caracteres)'),
});

// Protege /api/cron/drain de invocaciones externas
const cronSchema = z.object({
  CRON_SECRET: z.string().min(16),
});

export type EnvPublic = z.infer<typeof publicSchema>;
export type EnvSupabaseServer = z.infer<typeof supabaseServerSchema>;
export type EnvAnthropic = z.infer<typeof anthropicSchema>;
export type EnvMeta = z.infer<typeof metaSchema>;
export type EnvGoogleCalendar = z.infer<typeof googleCalendarSchema>;
export type EnvCron = z.infer<typeof cronSchema>;

function formatearError(error: z.ZodError): string {
  const detalles = error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  return `Variables de entorno inválidas o faltantes:\n${detalles}\n\nRevisa .env.example y tu archivo .env.local.`;
}

function asegurarServidor(nombreFuncion: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      `${nombreFuncion}() se invocó en el cliente. Los secretos nunca deben llegar al navegador.`,
    );
  }
}

function parsear<T extends z.ZodTypeAny>(
  schema: T,
  fuente: NodeJS.ProcessEnv,
): z.infer<T> {
  const parsed = schema.safeParse(fuente);
  if (!parsed.success) throw new Error(formatearError(parsed.error));
  return parsed.data;
}

/** Variables públicas. Seguras de usar en el cliente. */
export function envPublic(): EnvPublic {
  return parsear(publicSchema, process.env);
}

/** Credenciales de Supabase para el cliente admin (service_role). */
export function envSupabaseServer(): EnvSupabaseServer {
  asegurarServidor('envSupabaseServer');
  return parsear(supabaseServerSchema, process.env);
}

/** Clave de la API de Anthropic (Claude). */
export function envAnthropic(): EnvAnthropic {
  asegurarServidor('envAnthropic');
  return parsear(anthropicSchema, process.env);
}

/** Credenciales de Meta (WhatsApp Cloud API / Messenger / Instagram). */
export function envMeta(): EnvMeta {
  asegurarServidor('envMeta');
  return parsear(metaSchema, process.env);
}

/** Credenciales de la cuenta de Google Calendar de la empresa. */
export function envGoogleCalendar(): EnvGoogleCalendar {
  asegurarServidor('envGoogleCalendar');
  return parsear(googleCalendarSchema, process.env);
}

/** Secreto que protege el endpoint del drenador de la cola. */
export function envCron(): EnvCron {
  asegurarServidor('envCron');
  return parsear(cronSchema, process.env);
}
