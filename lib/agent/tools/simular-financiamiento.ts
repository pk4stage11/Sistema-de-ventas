import { z } from 'zod';
import type { ToolDefinition } from './types';

const inputSchema = z.object({
  precio_soles: z.number().positive(),
  cuota_inicial_soles: z.number().nonnegative(),
  plazo_anios: z.number().int().positive().max(30),
  tasa_efectiva_anual_pct: z
    .number()
    .positive()
    .max(50)
    .default(11)
    .describe(
      'Tasa efectiva anual estimada; 11% si no se indica otra (referencial, no una oferta real)',
    ),
});

type Input = z.infer<typeof inputSchema>;

type Output =
  | { error: string }
  | {
      monto_financiado_soles: number;
      cuota_mensual_estimada_soles: number;
      plazo_meses: number;
      tasa_efectiva_anual_pct: number;
      advertencia: string;
    };

/** Cuota fija mensual de un préstamo a tasa fija (amortización francesa). */
export function cuotaMensual(
  montoFinanciado: number,
  tasaEfectivaAnual: number,
  meses: number,
): number {
  const tasaMensual = Math.pow(1 + tasaEfectivaAnual, 1 / 12) - 1;
  if (tasaMensual === 0) return montoFinanciado / meses;
  const factor = Math.pow(1 + tasaMensual, meses);
  return montoFinanciado * ((tasaMensual * factor) / (factor - 1));
}

export const simularFinanciamiento: ToolDefinition<Input, Output> = {
  name: 'simular_financiamiento',
  description:
    'Calcula una cuota mensual ESTIMADA de crédito hipotecario a partir de precio, cuota inicial, plazo y tasa. Es solo referencial — nunca lo presentes como una oferta de crédito real ni como algo aprobado.',
  inputSchema,
  async execute(input) {
    if (input.cuota_inicial_soles >= input.precio_soles) {
      return {
        error: 'La cuota inicial no puede ser mayor o igual al precio de la unidad.',
      };
    }

    const montoFinanciado = input.precio_soles - input.cuota_inicial_soles;
    const meses = input.plazo_anios * 12;
    const cuota = cuotaMensual(
      montoFinanciado,
      input.tasa_efectiva_anual_pct / 100,
      meses,
    );

    return {
      monto_financiado_soles: Math.round(montoFinanciado),
      cuota_mensual_estimada_soles: Math.round(cuota),
      plazo_meses: meses,
      tasa_efectiva_anual_pct: input.tasa_efectiva_anual_pct,
      advertencia:
        'Esto es una simulación referencial, no una oferta de crédito. La aprobación final y la tasa real las define el banco.',
    };
  },
};
