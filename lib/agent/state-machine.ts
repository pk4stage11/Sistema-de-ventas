import type { EstadoLead } from './types';

/**
 * Grafo de transiciones válidas. Es una propiedad del estado del lead, no
 * de quién dispara la transición — el agente (Fase 4) y un humano desde la
 * bandeja (fases posteriores) comparten esta misma tabla.
 *
 * `derivado_humano` es alcanzable desde cualquier estado no terminal
 * (regla dura del agente: escala ante reclamo, tema legal, negociación de
 * precio, o dos respuestas seguidas de baja confianza — ver
 * lib/agent/prompt.ts). Desde ahí, un humano puede retomar el flujo en
 * cualquier punto razonable; por eso no se restringe a una sola salida.
 */
const TRANSICIONES: Record<EstadoLead, readonly EstadoLead[]> = {
  nuevo: ['calificando', 'derivado_humano'],
  calificando: ['calificado', 'derivado_humano'],
  calificado: ['cita_agendada', 'derivado_humano'],
  cita_agendada: [
    'visita_realizada',
    'cita_no_asistida',
    'cita_reprogramada',
    'derivado_humano',
  ],
  cita_no_asistida: ['cita_reprogramada', 'derivado_humano'],
  cita_reprogramada: ['cita_agendada', 'derivado_humano'],
  visita_realizada: ['propuesta_enviada', 'derivado_humano'],
  propuesta_enviada: ['reserva_pendiente', 'derivado_humano'],
  reserva_pendiente: ['cerrado_ganado', 'cerrado_perdido', 'derivado_humano'],
  cerrado_ganado: [],
  cerrado_perdido: [],
  derivado_humano: [
    'calificando',
    'calificado',
    'cita_agendada',
    'visita_realizada',
    'propuesta_enviada',
    'reserva_pendiente',
  ],
};

export function transicionesValidasDesde(estado: EstadoLead): readonly EstadoLead[] {
  return TRANSICIONES[estado];
}

export function esTransicionValida(desde: EstadoLead, hasta: EstadoLead): boolean {
  if (desde === hasta) return true; // no-op: quedarse en el mismo estado siempre es válido
  return TRANSICIONES[desde].includes(hasta);
}

export function esEstadoTerminal(estado: EstadoLead): boolean {
  return TRANSICIONES[estado].length === 0;
}

/**
 * Lanza si la transición no es válida — para usar en el punto donde el
 * agente (o un server action humano) está por escribir `leads.estado`.
 */
export function asegurarTransicionValida(desde: EstadoLead, hasta: EstadoLead): void {
  if (!esTransicionValida(desde, hasta)) {
    throw new Error(`Transición de lead inválida: "${desde}" → "${hasta}"`);
  }
}
