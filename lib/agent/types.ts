/**
 * Estados del lead, en el mismo orden y con los mismos valores que el
 * CHECK constraint de `leads.estado` (supabase/migrations/...leads_y_calificacion.sql).
 * Fuente única de verdad en TypeScript — si se agrega un estado acá sin
 * agregarlo también en la migración, la base lo rechaza.
 */
export const ESTADOS_LEAD = [
  'nuevo',
  'calificando',
  'calificado',
  'cita_agendada',
  'visita_realizada',
  'cita_no_asistida',
  'cita_reprogramada',
  'propuesta_enviada',
  'reserva_pendiente',
  'cerrado_ganado',
  'cerrado_perdido',
  'derivado_humano',
] as const;

export type EstadoLead = (typeof ESTADOS_LEAD)[number];
