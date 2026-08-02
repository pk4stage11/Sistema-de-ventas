import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ToolDefinition } from './types';

/**
 * No es una de las 8 tools que lista el plan original, pero hace falta:
 * la tabla `lead_qualification` existe justo para guardar estos datos de
 * forma estructurada, y sin una tool que la escriba, la calificación
 * obligatoria que pide el system prompt no tendría dónde persistirse.
 * Documentado en docs/decisiones.md.
 */
const inputSchema = z.object({
  tipo_inmueble: z.string().optional(),
  distrito: z.string().optional(),
  presupuesto_min: z.number().positive().optional(),
  presupuesto_max: z.number().positive().optional(),
  forma_pago: z.enum(['contado', 'credito_hipotecario']).optional(),
  banco: z.string().optional(),
  precalificado: z.boolean().optional(),
  plazo_decision: z.string().optional(),
  primera_vivienda: z.boolean().optional(),
  notas: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output = { guardado: boolean; calificacion_completa: boolean };

const CAMPOS_CLAVE = [
  'tipo_inmueble',
  'distrito',
  'presupuesto_max',
  'forma_pago',
] as const;

export const guardarCalificacion: ToolDefinition<Input, Output> = {
  name: 'guardar_calificacion',
  description:
    'Guarda o actualiza los datos de calificación del lead a medida que los vas obteniendo — no hace falta esperar a tener todos. Llámala cada vez que el cliente te dé un dato nuevo (distrito, presupuesto, forma de pago, etc.).',
  inputSchema,
  async execute(input, ctx) {
    const db = supabaseAdmin();

    const { data: existente } = await db
      .from('lead_qualification')
      .select('id')
      .eq('lead_id', ctx.leadId)
      .maybeSingle();

    if (existente) {
      await db.from('lead_qualification').update(input).eq('id', existente.id);
    } else {
      await db
        .from('lead_qualification')
        .insert({ org_id: ctx.orgId, lead_id: ctx.leadId, ...input });
    }

    const { data: completo } = await db
      .from('lead_qualification')
      .select('tipo_inmueble, distrito, presupuesto_max, forma_pago')
      .eq('lead_id', ctx.leadId)
      .single();
    const calificacionCompleta = Boolean(
      completo && CAMPOS_CLAVE.every((c) => completo[c] != null),
    );

    const { data: lead } = await db
      .from('leads')
      .select('estado')
      .eq('id', ctx.leadId)
      .single();
    if (lead?.estado === 'nuevo') {
      await db.from('leads').update({ estado: 'calificando' }).eq('id', ctx.leadId);
    } else if (lead?.estado === 'calificando' && calificacionCompleta) {
      await db.from('leads').update({ estado: 'calificado' }).eq('id', ctx.leadId);
    }

    return { guardado: true, calificacion_completa: calificacionCompleta };
  },
};
