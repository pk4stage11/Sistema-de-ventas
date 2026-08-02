import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generarCotizacionPdf } from '@/lib/documents/cotizacion-pdf';
import { cuotaMensual } from './simular-financiamiento';
import { esTransicionValida } from '@/lib/agent/state-machine';
import type { EstadoLead } from '@/lib/agent/types';
import type { ToolDefinition } from './types';

const VENCIMIENTO_URL_SEGUNDOS = 7 * 24 * 60 * 60; // 7 días

const inputSchema = z.object({
  unit_id: z.string().uuid(),
  cuota_inicial_soles: z.number().positive().optional(),
  plazo_anios: z.number().int().positive().max(30).optional(),
});

type Input = z.infer<typeof inputSchema>;
type Output =
  { error: string } | { url: string; vence_en_dias: number; mensaje: string };

export const generarCotizacion: ToolDefinition<Input, Output> = {
  name: 'generar_cotizacion',
  description:
    'Genera un PDF de cotización referencial para una unidad específica y devuelve un link para enviárselo al cliente. Si das cuota inicial y plazo, incluye una simulación de financiamiento (siempre referencial).',
  inputSchema,
  async execute(input, ctx) {
    const db = supabaseAdmin();

    const { data: unidad, error: errorUnidad } = await db
      .from('units')
      .select('codigo, tipologia, m2, piso, precio, projects(name, distrito)')
      .eq('id', input.unit_id)
      .eq('org_id', ctx.orgId)
      .single();
    if (errorUnidad || !unidad)
      return { error: 'No se encontró esa unidad en el catálogo.' };

    const { data: org } = await db
      .from('organizations')
      .select('name')
      .eq('id', ctx.orgId)
      .single();

    const proyecto = unidad.projects as unknown as {
      name: string;
      distrito: string | null;
    } | null;

    const condiciones =
      input.cuota_inicial_soles && input.plazo_anios
        ? {
            cuotaInicialSoles: input.cuota_inicial_soles,
            plazoAnios: input.plazo_anios,
            cuotaMensualEstimadaSoles: Math.round(
              cuotaMensual(
                unidad.precio - input.cuota_inicial_soles,
                0.11,
                input.plazo_anios * 12,
              ),
            ),
          }
        : undefined;

    const pdfBytes = await generarCotizacionPdf({
      organizacion: org?.name ?? 'Inmobiliaria',
      proyecto: proyecto?.name ?? 'Proyecto',
      distrito: proyecto?.distrito ?? null,
      unidadCodigo: unidad.codigo,
      tipologia: unidad.tipologia,
      m2: unidad.m2,
      piso: unidad.piso,
      precioSoles: unidad.precio,
      condiciones,
      fecha: new Date().toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Lima',
      }),
    });

    const rutaArchivo = `${ctx.orgId}/${ctx.leadId}/${randomUUID()}.pdf`;
    const { error: errorSubida } = await db.storage
      .from('cotizaciones')
      .upload(rutaArchivo, pdfBytes, { contentType: 'application/pdf' });
    if (errorSubida) throw errorSubida;

    const { data: urlFirmada, error: errorUrl } = await db.storage
      .from('cotizaciones')
      .createSignedUrl(rutaArchivo, VENCIMIENTO_URL_SEGUNDOS);
    if (errorUrl || !urlFirmada)
      throw errorUrl ?? new Error('No se pudo generar el link firmado');

    await db.from('quotes').insert({
      org_id: ctx.orgId,
      lead_id: ctx.leadId,
      unit_id: input.unit_id,
      condiciones: condiciones ?? {},
      storage_path: rutaArchivo,
      generado_por: 'ia',
    });

    const { data: lead } = await db
      .from('leads')
      .select('estado')
      .eq('id', ctx.leadId)
      .single();
    if (lead && esTransicionValida(lead.estado as EstadoLead, 'propuesta_enviada')) {
      await db
        .from('leads')
        .update({ estado: 'propuesta_enviada' })
        .eq('id', ctx.leadId);
    }

    return {
      url: urlFirmada.signedUrl,
      vence_en_dias: 7,
      mensaje:
        'Cotización generada. Comparte este link con el cliente — vence en 7 días.',
    };
  },
};
