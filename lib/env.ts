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

// Meta — verificación del webhook (Fase 2): lo mínimo para recibir mensajes.
const metaWebhookSchema = z.object({
  META_APP_SECRET: z.string().min(1),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
});

// Meta — envío saliente por WhatsApp (Fase 4 en adelante). Separado del
// anterior a propósito: el webhook de ingesta no necesita estas credenciales
// para funcionar, y exigirlas juntas rompía las pruebas locales de Fase 2.
const whatsappSendSchema = z.object({
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
export type EnvMetaWebhook = z.infer<typeof metaWebhookSchema>;
export type EnvWhatsappSend = z.infer<typeof whatsappSendSchema>;
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

/**
 * Variables públicas. Seguras de usar en el cliente.
 *
 * A propósito NO usa el helper `parsear()` con `process.env` completo:
 * Next.js solo puede inlinear `NEXT_PUBLIC_*` en el bundle del navegador
 * cuando el acceso es una expresión estática literal
 * (`process.env.NEXT_PUBLIC_X`) que su compilador puede reconocer en el
 * código fuente. Pasarle el objeto `process.env` completo a Zod en
 * runtime (como hacen las demás funciones de este archivo, todas
 * server-only) no es estático — en el cliente `process.env` ni siquiera
 * existe como objeto real, así que esas variables llegarían `undefined`.
 */
export function envPublic(): EnvPublic {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) throw new Error(formatearError(parsed.error));
  return parsed.data;
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

/** Credenciales para verificar webhooks de Meta (firma + hub.challenge). */
export function envMetaWebhook(): EnvMetaWebhook {
  asegurarServidor('envMetaWebhook');
  return parsear(metaWebhookSchema, process.env);
}

/** Credenciales para enviar mensajes por WhatsApp Cloud API. */
export function envWhatsappSend(): EnvWhatsappSend {
  asegurarServidor('envWhatsappSend');
  return parsear(whatsappSendSchema, process.env);
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
