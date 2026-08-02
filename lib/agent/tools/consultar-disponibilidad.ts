import { z } from 'zod';
import { calcularSlotsDisponibles, type SlotDisponible } from '@/lib/calendar/slots';
import type { ToolDefinition } from './types';

const inputSchema = z.object({
  dias_hacia_adelante: z.number().int().positive().max(30).optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output = { slots: SlotDisponible[]; mensaje?: string };

export const consultarDisponibilidad: ToolDefinition<Input, Output> = {
  name: 'consultar_disponibilidad',
  description:
    'Devuelve los horarios REALES disponibles para agendar una visita, cruzando el horario de atención con las visitas ya agendadas. Nunca ofrezcas un horario que no venga en este resultado.',
  inputSchema,
  async execute(input, ctx) {
    const slots = await calcularSlotsDisponibles(ctx.orgId, {
      diasHaciaAdelante: input.dias_hacia_adelante ?? 7,
      maxSlots: 5,
    });

    if (slots.length === 0) {
      return {
        slots: [],
        mensaje: 'No hay horarios configurados o todos están ocupados en este rango.',
      };
    }
    return { slots };
  },
};
