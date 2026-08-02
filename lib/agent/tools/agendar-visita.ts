import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { asegurarTransicionValida } from '@/lib/agent/state-machine';
import type { EstadoLead } from '@/lib/agent/types';
import type { ToolDefinition } from './types';

const inputSchema = z.object({
  inicio: z.string().datetime({ offset: true }),
  fin: z.string().datetime({ offset: true }),
  project_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output =
  | { error: string }
  | { visita_id: string; confirmado: true; inicio: string; fin: string };

export const agendarVisita: ToolDefinition<Input, Output> = {
  name: 'agendar_visita',
  description:
    'Agenda una visita en un horario EXACTO de los que devolvió consultar_disponibilidad — nunca la llames con un horario inventado. Este es el cierre del agente: una vez agendada, el resto del proceso lo lleva un asesor humano.',
  inputSchema,
  async execute(input, ctx) {
    const db = supabaseAdmin();

    const { data: lead, error: errorLead } = await db
      .from('leads')
      .select('estado, assigned_user_id')
      .eq('id', ctx.leadId)
      .single();
    if (errorLead || !lead) throw errorLead ?? new Error('Lead no encontrado');

    asegurarTransicionValida(lead.estado as EstadoLead, 'cita_agendada');

    // Asesor: el ya asignado al lead, o si no hay ninguno, cualquier
    // usuario activo de la org (la asignación fina llega en fases
    // posteriores de la bandeja).
    let asesorId = lead.assigned_user_id;
    if (!asesorId) {
      const { data: asesor } = await db
        .from('users')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      asesorId = asesor?.id ?? null;
    }
    if (!asesorId) {
      return {
        error: 'No hay ningún asesor activo en la organización para asignar la visita.',
      };
    }

    const { data: visita, error: errorVisita } = await db
      .from('visits')
      .insert({
        org_id: ctx.orgId,
        lead_id: ctx.leadId,
        project_id: input.project_id ?? null,
        unit_id: input.unit_id ?? null,
        asesor_id: asesorId,
        inicio: input.inicio,
        fin: input.fin,
      })
      .select('id')
      .single();

    if (errorVisita) {
      // 23P01 = exclusion_violation: alguien más tomó ese horario justo antes.
      if (errorVisita.code === '23P01') {
        return {
          error:
            'Ese horario se acaba de ocupar. Vuelve a llamar a consultar_disponibilidad para ofrecer otro.',
        };
      }
      throw errorVisita;
    }

    await db.from('leads').update({ estado: 'cita_agendada' }).eq('id', ctx.leadId);

    return {
      visita_id: visita.id,
      confirmado: true,
      inicio: input.inicio,
      fin: input.fin,
    };
  },
};
