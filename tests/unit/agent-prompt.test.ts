import { describe, expect, it } from 'vitest';
import { construirSystemPrompt } from '@/lib/agent/prompt';

describe('construirSystemPrompt', () => {
  const prompt = construirSystemPrompt({
    nombreOrganizacion: 'InteresArte',
    fechaHoyLima: '2026-08-01',
  });

  it('interpola el nombre de la organización y la fecha', () => {
    expect(prompt).toContain('InteresArte');
    expect(prompt).toContain('2026-08-01');
  });

  it('declara la cita agendada como único objetivo de cierre', () => {
    expect(prompt).toMatch(/VISITA AGENDADA/);
    expect(prompt).toMatch(/No cierras ventas, no cobras/);
  });

  it('incluye las cinco reglas duras', () => {
    expect(prompt).toMatch(/NUNCA inventas precios/);
    expect(prompt).toMatch(/NUNCA prometes descuentos/);
    expect(prompt).toMatch(/NUNCA cierras un cobro/);
    expect(prompt).toMatch(/SOLO ofreces los horarios/);
    expect(prompt).toMatch(/Escalas a `escalar_a_humano`/);
  });

  it('menciona las 8 tools por nombre', () => {
    for (const tool of [
      'buscar_unidades',
      'consultar_catalogo_rag',
      'simular_financiamiento',
      'consultar_disponibilidad',
      'agendar_visita',
      'generar_cotizacion',
      'crear_solicitud_reserva',
      'escalar_a_humano',
    ]) {
      expect(prompt).toContain(tool);
    }
  });
});
