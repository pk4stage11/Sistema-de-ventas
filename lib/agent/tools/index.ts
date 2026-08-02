import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import type { ToolDefinition } from './types';
import { buscarUnidades } from './buscar-unidades';
import { consultarCatalogoRag } from './consultar-catalogo-rag';
import { simularFinanciamiento } from './simular-financiamiento';
import { consultarDisponibilidad } from './consultar-disponibilidad';
import { agendarVisita } from './agendar-visita';
import { generarCotizacion } from './generar-cotizacion';
import { crearSolicitudReserva } from './crear-solicitud-reserva';
import { escalarAHumano } from './escalar-a-humano';
import { guardarCalificacion } from './guardar-calificacion';

/**
 * Las 8 tools del plan original + `guardar_calificacion` (bridge
 * necesario, ver ese archivo). Un solo array: agregar una tool nueva acá
 * es lo único que hace falta para que el runner y el prompt la conozcan.
 */
export const TOOLS: ToolDefinition[] = [
  buscarUnidades,
  consultarCatalogoRag,
  simularFinanciamiento,
  consultarDisponibilidad,
  agendarVisita,
  generarCotizacion,
  crearSolicitudReserva,
  escalarAHumano,
  guardarCalificacion,
] as ToolDefinition[];

export const TOOLS_POR_NOMBRE = new Map(TOOLS.map((t) => [t.name, t]));

/** Definiciones en el formato que espera la API de Anthropic (tool use). */
export function definicionesParaClaude(): Anthropic.Tool[] {
  return TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: z.toJSONSchema(tool.inputSchema) as Anthropic.Tool['input_schema'],
  }));
}
