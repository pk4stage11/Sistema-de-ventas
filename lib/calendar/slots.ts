import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Cálculo de slots disponibles, cruzando `availability_rules` con las
 * visitas ya agendadas. Todavía no consulta Google Calendar (Fase 4.5 lo
 * suma sobre esta misma función, sin cambiar su firma) — por ahora la
 * única fuente de verdad de qué está ocupado es la propia tabla `visits`.
 *
 * Perú no tiene horario de verano, así que el offset de Lima (UTC-5) es
 * fijo — no hace falta una librería de zonas horarias para esto.
 */
const OFFSET_LIMA_HORAS = 5;

export interface SlotDisponible {
  inicio: string; // ISO UTC
  fin: string; // ISO UTC
}

function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function limaDateTimeToUtc(fechaYMD: string, minutosDelDia: number): Date {
  const horas = Math.floor(minutosDelDia / 60);
  const minutos = minutosDelDia % 60;
  const utc = new Date(`${fechaYMD}T00:00:00.000Z`);
  utc.setUTCHours(horas + OFFSET_LIMA_HORAS, minutos, 0, 0);
  return utc;
}

export async function calcularSlotsDisponibles(
  orgId: string,
  opciones: { desde?: Date; diasHaciaAdelante?: number; maxSlots?: number } = {},
): Promise<SlotDisponible[]> {
  const db = supabaseAdmin();
  const desde = opciones.desde ?? new Date();
  const diasHaciaAdelante = opciones.diasHaciaAdelante ?? 7;
  const maxSlots = opciones.maxSlots ?? 5;

  const { data: reglas, error: errorReglas } = await db
    .from('availability_rules')
    .select(
      'dia_semana, hora_inicio, hora_fin, duracion_visita_minutos, buffer_minutos',
    )
    .eq('org_id', orgId)
    .eq('activo', true);
  if (errorReglas) throw errorReglas;
  if (!reglas || reglas.length === 0) return [];

  const hasta = new Date(desde.getTime() + diasHaciaAdelante * 24 * 60 * 60 * 1000);
  const { data: visitasExistentes, error: errorVisitas } = await db
    .from('visits')
    .select('inicio, fin')
    .eq('org_id', orgId)
    .gte('inicio', desde.toISOString())
    .lte('inicio', hasta.toISOString());
  if (errorVisitas) throw errorVisitas;

  const ocupados = (visitasExistentes ?? []).map((v) => ({
    inicio: new Date(v.inicio).getTime(),
    fin: new Date(v.fin).getTime(),
  }));

  const slots: SlotDisponible[] = [];

  for (let dia = 0; dia < diasHaciaAdelante && slots.length < maxSlots; dia++) {
    const fecha = new Date(desde.getTime() + dia * 24 * 60 * 60 * 1000);
    const fechaYMD = fecha.toISOString().slice(0, 10);
    const diaSemana = fecha.getUTCDay(); // 0=domingo, igual que availability_rules.dia_semana

    const reglaDelDia = reglas.find((r) => r.dia_semana === diaSemana);
    if (!reglaDelDia) continue;

    const inicioMin = horaAMinutos(reglaDelDia.hora_inicio);
    const finMin = horaAMinutos(reglaDelDia.hora_fin);
    const paso = reglaDelDia.duracion_visita_minutos + reglaDelDia.buffer_minutos;

    for (
      let m = inicioMin;
      m + reglaDelDia.duracion_visita_minutos <= finMin;
      m += paso
    ) {
      const inicioSlot = limaDateTimeToUtc(fechaYMD, m);
      const finSlot = new Date(
        inicioSlot.getTime() + reglaDelDia.duracion_visita_minutos * 60_000,
      );

      if (inicioSlot.getTime() <= Date.now()) continue; // no ofrecer horarios ya pasados

      const seSolapa = ocupados.some(
        (o) => inicioSlot.getTime() < o.fin && finSlot.getTime() > o.inicio,
      );
      if (seSolapa) continue;

      slots.push({ inicio: inicioSlot.toISOString(), fin: finSlot.toISOString() });
      if (slots.length >= maxSlots) break;
    }
  }

  return slots;
}
