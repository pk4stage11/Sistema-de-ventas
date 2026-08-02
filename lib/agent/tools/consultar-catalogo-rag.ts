import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ToolDefinition } from './types';

const inputSchema = z.object({
  pregunta: z
    .string()
    .min(3)
    .describe(
      'La pregunta o palabra clave a buscar, ej. "áreas comunes" o "avance de obra"',
    ),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Versión simple de búsqueda del catálogo: texto plano sobre las fichas de
 * proyecto (búsqueda de texto completo de Postgres, no embeddings). Es
 * deliberado — no hay proveedor de embeddings configurado todavía; cuando
 * se agregue (Voyage AI u otro), esta tool pasa a usar `catalog_embeddings`
 * sin cambiar su interfaz hacia el agente.
 */
export const consultarCatalogoRag: ToolDefinition<Input> = {
  name: 'consultar_catalogo_rag',
  description:
    'Busca en las fichas de los proyectos (descripción, avance de obra, áreas comunes) por palabra clave. Úsala para preguntas sobre el proyecto en sí, no para buscar unidades específicas (para eso usa buscar_unidades).',
  inputSchema,
  async execute(input, ctx) {
    const db = supabaseAdmin();
    const termino = `%${input.pregunta.trim()}%`;

    const { data, error } = await db
      .from('projects')
      .select('name, distrito, descripcion, avance_obra, areas_comunes')
      .eq('org_id', ctx.orgId)
      .or(`descripcion.ilike.${termino},avance_obra.ilike.${termino}`)
      .limit(3);
    if (error) throw error;

    if (!data || data.length === 0) {
      // Fallback: si no matcheó texto libre, igual devuelve las áreas
      // comunes de los proyectos de la org — dato estructurado, no texto
      // libre, así que no hace falta que calce con la búsqueda ILIKE.
      const { data: proyectos } = await db
        .from('projects')
        .select('name, distrito, areas_comunes')
        .eq('org_id', ctx.orgId)
        .limit(3);
      return {
        coincidencias_exactas: false,
        proyectos: proyectos ?? [],
      };
    }

    return { coincidencias_exactas: true, proyectos: data };
  },
};
