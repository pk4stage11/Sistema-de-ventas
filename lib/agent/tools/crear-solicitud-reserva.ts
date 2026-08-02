import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { asegurarTransicionValida } from '@/lib/agent/state-machine';
import type { EstadoLead } from '@/lib/agent/types';
import type { ToolDefinition } from './types';

const inputSchema = z.object({
  unit_id: z.string().uuid(),
  monto_separacion_soles: z.number().positive().optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output =
  { error: string } | { solicitud_id: string; estado: string; mensaje: string };

export const crearSolicitudReserva: ToolDefinition<Input, Output> = {
  name: 'crear_solicitud_reserva',
  description:
    'Crea una SOLICITUD de reserva pendiente de revisión humana. Nunca cobra ni confirma un pago — solo registra la intención para que un asesor la apruebe o rechace.',
  inputSchema,
  async execute(input, ctx) {
    const db = supabaseAdmin();

    const { data: lead, error: errorLead } = await db
      .from('leads')
      .select('estado')
      .eq('id', ctx.leadId)
      .single();
    if (errorLead || !lead) throw errorLead ?? new Error('Lead no encontrado');
    asegurarTransicionValida(lead.estado as EstadoLead, 'reserva_pendiente');

    const { data, error } = await db
      .from('reservations')
      .insert({
        org_id: ctx.orgId,
        lead_id: ctx.leadId,
        unit_id: input.unit_id,
        monto_separacion: input.monto_separacion_soles ?? null,
        creado_por_ia: true,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          error:
            'Esa unidad ya tiene una reserva activa (pendiente o aprobada). No se puede solicitar de nuevo — sugiere otra unidad.',
        };
      }
      throw error;
    }

    await db.from('leads').update({ estado: 'reserva_pendiente' }).eq('id', ctx.leadId);

    return {
      solicitud_id: data.id,
      estado: 'pendiente',
      mensaje:
        'Solicitud registrada. Un asesor la va a revisar y confirmar — nada quedó cobrado.',
    };
  },
};
