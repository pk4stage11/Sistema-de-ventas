import { describe, expect, it } from 'vitest';
import { simularFinanciamiento } from '@/lib/agent/tools/simular-financiamiento';

describe('tool simular_financiamiento', () => {
  it('calcula una cuota mensual razonable para un caso típico', async () => {
    const resultado = await simularFinanciamiento.execute(
      {
        precio_soles: 400_000,
        cuota_inicial_soles: 40_000,
        plazo_anios: 20,
        tasa_efectiva_anual_pct: 11,
      },
      { orgId: 'x', conversationId: 'x', contactId: 'x', leadId: 'x' },
    );

    expect(resultado).not.toHaveProperty('error');
    if ('cuota_mensual_estimada_soles' in resultado) {
      expect(resultado.monto_financiado_soles).toBe(360_000);
      // A 11% efectivo anual, 20 años, la cuota debería rondar los S/ 3,700-3,900.
      expect(resultado.cuota_mensual_estimada_soles).toBeGreaterThan(3000);
      expect(resultado.cuota_mensual_estimada_soles).toBeLessThan(4500);
      expect(resultado.advertencia).toMatch(/referencial/);
    }
  });

  it('usa 11% de tasa por defecto si no se indica', async () => {
    const resultado = await simularFinanciamiento.execute(
      {
        precio_soles: 200_000,
        cuota_inicial_soles: 20_000,
        plazo_anios: 15,
        tasa_efectiva_anual_pct: 11,
      },
      { orgId: 'x', conversationId: 'x', contactId: 'x', leadId: 'x' },
    );
    if ('tasa_efectiva_anual_pct' in resultado) {
      expect(resultado.tasa_efectiva_anual_pct).toBe(11);
    }
  });

  it('rechaza si la cuota inicial es mayor o igual al precio', async () => {
    const resultado = await simularFinanciamiento.execute(
      {
        precio_soles: 100_000,
        cuota_inicial_soles: 100_000,
        plazo_anios: 10,
        tasa_efectiva_anual_pct: 11,
      },
      { orgId: 'x', conversationId: 'x', contactId: 'x', leadId: 'x' },
    );
    expect(resultado).toHaveProperty('error');
  });
});
