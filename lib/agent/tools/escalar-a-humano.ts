import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ToolDefinition } from './types';

const inputSchema = z.object({
  motivo: z
    .string()
    .min(3)
    .describe(
      'Por qué se escala: reclamo, tema legal, negociación de precio, baja confianza, etc.',
    ),
});

type Input = z.infer<typeof inputSchema>;
type Output = { escalado: boolean; mensaje: string };

export const escalarAHumano: ToolDefinition<Input, Output> = {
  name: 'escalar_a_humano',
  description:
    'Deriva la conversación a un asesor humano y pausa al agente en ese hilo. Úsala de inmediato ante un reclamo, un tema legal o contractual, negociación de precio o condiciones, o dos respuestas tuyas seguidas de baja confianza.',
  inputSchema,
  async execute(input, ctx) {
    const db = supabaseAdmin();

    await db.from('leads').update({ estado: 'derivado_humano' }).eq('id', ctx.leadId);
    await db
      .from('conversations')
      .update({ ia_activa: false })
      .eq('id', ctx.conversationId);
    await db.from('audit_log').insert({
      org_id: ctx.orgId,
      user_id: null, // lo dispara el agente, no un humano
      accion: 'escalar_a_humano',
      entidad: 'leads',
      entidad_id: ctx.leadId,
      detalle: { motivo: input.motivo },
    });

    return {
      escalado: true,
      mensaje:
        'Conversación derivada a un asesor. El agente queda pausado en este hilo.',
    };
  },
};
