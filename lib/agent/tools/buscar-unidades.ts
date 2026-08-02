import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ToolDefinition } from './types';

const inputSchema = z.object({
  distrito: z
    .string()
    .optional()
    .describe('Distrito o zona de interés, ej. "Miraflores"'),
  presupuesto_max: z
    .number()
    .positive()
    .optional()
    .describe('Presupuesto máximo en soles'),
  dormitorios: z.number().int().positive().optional(),
  tipologia_contiene: z
    .string()
    .optional()
    .describe('Texto libre a buscar en la tipología, ej. "dúplex"'),
});

type Input = z.infer<typeof inputSchema>;

interface UnidadResultado {
  proyecto: string | null;
  distrito: string | null;
  codigo: string;
  tipologia: string | null;
  m2: number | null;
  dormitorios: number | null;
  banos: number | null;
  piso: number | null;
  precio_soles: number;
}

type Output = { unidades: UnidadResultado[]; mensaje?: string };

export const buscarUnidades: ToolDefinition<Input, Output> = {
  name: 'buscar_unidades',
  description:
    'Busca unidades DISPONIBLES en el catálogo real por distrito, presupuesto máximo, número de dormitorios y/o tipología. Devuelve como máximo 5 resultados, las más baratas primero. Nunca inventes una unidad que no aparezca acá.',
  inputSchema,
  async execute(input, ctx) {
    const db = supabaseAdmin();
    let query = db
      .from('units')
      .select(
        'codigo, tipologia, m2, dormitorios, banos, piso, precio, projects(name, distrito)',
      )
      .eq('org_id', ctx.orgId)
      .eq('estado', 'disponible')
      .order('precio', { ascending: true })
      .limit(5);

    if (input.presupuesto_max) query = query.lte('precio', input.presupuesto_max);
    if (input.dormitorios) query = query.eq('dormitorios', input.dormitorios);
    if (input.tipologia_contiene) {
      query = query.ilike('tipologia', `%${input.tipologia_contiene}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // El filtro por distrito vive en `projects`, no en `units` — no hay
    // forma limpia de filtrar sobre una columna embebida en PostgREST, así
    // que se filtra en memoria (el resultado ya viene acotado a 5).
    const filtradas = input.distrito
      ? (data ?? []).filter((u) => {
          const proyecto = u.projects as unknown as { distrito: string | null } | null;
          return proyecto?.distrito
            ?.toLowerCase()
            .includes(input.distrito!.toLowerCase());
        })
      : (data ?? []);

    if (filtradas.length === 0) {
      return {
        unidades: [],
        mensaje: 'No hay unidades disponibles que calcen con esos filtros.',
      };
    }

    return {
      unidades: filtradas.map((u) => {
        const proyecto = u.projects as unknown as {
          name: string;
          distrito: string | null;
        } | null;
        return {
          proyecto: proyecto?.name ?? null,
          distrito: proyecto?.distrito ?? null,
          codigo: u.codigo,
          tipologia: u.tipologia,
          m2: u.m2,
          dormitorios: u.dormitorios,
          banos: u.banos,
          piso: u.piso,
          precio_soles: u.precio,
        };
      }),
    };
  },
};
