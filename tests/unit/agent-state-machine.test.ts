import { describe, expect, it } from 'vitest';
import {
  asegurarTransicionValida,
  esEstadoTerminal,
  esTransicionValida,
} from '@/lib/agent/state-machine';
import { ESTADOS_LEAD } from '@/lib/agent/types';

describe('máquina de estados del lead', () => {
  it('permite el camino feliz completo hasta cerrado_ganado', () => {
    const camino = [
      'nuevo',
      'calificando',
      'calificado',
      'cita_agendada',
      'visita_realizada',
      'propuesta_enviada',
      'reserva_pendiente',
      'cerrado_ganado',
    ] as const;

    for (let i = 0; i < camino.length - 1; i++) {
      expect(esTransicionValida(camino[i]!, camino[i + 1]!)).toBe(true);
    }
  });

  it('rechaza saltarse pasos (nuevo → cita_agendada directo)', () => {
    expect(esTransicionValida('nuevo', 'cita_agendada')).toBe(false);
  });

  it('rechaza retroceder sin pasar por el humano (calificado → nuevo)', () => {
    expect(esTransicionValida('calificado', 'nuevo')).toBe(false);
  });

  it('derivado_humano es alcanzable desde cualquier estado no terminal', () => {
    for (const estado of ESTADOS_LEAD) {
      if (esEstadoTerminal(estado)) continue;
      expect(esTransicionValida(estado, 'derivado_humano')).toBe(true);
    }
  });

  it('cerrado_ganado y cerrado_perdido son terminales', () => {
    expect(esEstadoTerminal('cerrado_ganado')).toBe(true);
    expect(esEstadoTerminal('cerrado_perdido')).toBe(true);
    expect(esTransicionValida('cerrado_ganado', 'derivado_humano')).toBe(false);
  });

  it('quedarse en el mismo estado siempre es válido (no-op)', () => {
    for (const estado of ESTADOS_LEAD) {
      expect(esTransicionValida(estado, estado)).toBe(true);
    }
  });

  it('asegurarTransicionValida lanza en una transición inválida', () => {
    expect(() => asegurarTransicionValida('nuevo', 'cerrado_ganado')).toThrow(
      /Transición de lead inválida/,
    );
  });

  it('asegurarTransicionValida no lanza en una transición válida', () => {
    expect(() => asegurarTransicionValida('nuevo', 'calificando')).not.toThrow();
  });
});
