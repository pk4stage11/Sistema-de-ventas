import type { z } from 'zod';

/**
 * Contexto de la conversación en curso, disponible para cualquier tool sin
 * que el modelo tenga que pasarlo como argumento (evita que Claude pueda
 * "inventar" un org_id o lead_id ajeno).
 */
export interface ToolContext {
  orgId: string;
  conversationId: string;
  contactId: string;
  leadId: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

/** Result homogéneo para errores esperables (no técnicos) que el modelo debe poder leer y ajustar su respuesta. */
export interface ResultadoConError {
  error: string;
}
