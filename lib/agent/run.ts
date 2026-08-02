import Anthropic from '@anthropic-ai/sdk';
import { envAnthropic } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { construirSystemPrompt } from './prompt';
import { TOOLS_POR_NOMBRE, definicionesParaClaude } from './tools';
import type { ToolContext } from './tools/types';

const MODELO: Anthropic.Model = 'claude-sonnet-5';
// Tope de idas y vueltas de tool-use dentro de un mismo turno — evita un
// loop infinito si el modelo insiste en llamar tools sin nunca responder.
const MAX_TURNOS_HERRAMIENTA = 6;
// Límite de historial enviado al modelo (Fase 4: "límite de historial +
// caché de contexto del catálogo" — el caché de prompt llega cuando el
// volumen lo justifique; el límite de historial es lo que controla costo
// desde ahora).
const MAX_MENSAJES_HISTORIAL = 20;

export interface ResultadoTurno {
  /** Texto final para enviar al cliente. null si se escaló sin nada que decir, o si la IA está pausada. */
  respuesta: string | null;
  toolsLlamadas: string[];
}

async function obtenerOCrearLead(
  db: ReturnType<typeof supabaseAdmin>,
  orgId: string,
  contactId: string,
): Promise<string> {
  const { data: existente } = await db
    .from('leads')
    .select('id')
    .eq('org_id', orgId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existente) return existente.id;

  const { data: creado, error } = await db
    .from('leads')
    .insert({ org_id: orgId, contact_id: contactId })
    .select('id')
    .single();
  if (error || !creado) throw error ?? new Error('No se pudo crear el lead');
  return creado.id;
}

/**
 * Corre un turno completo del agente para una conversación: arma el
 * historial, llama a Claude con tool use, ejecuta las tools que pida
 * (hasta MAX_TURNOS_HERRAMIENTA idas y vueltas), y registra todo en
 * `agent_runs`. No envía el mensaje de salida por WhatsApp — eso lo hace
 * quien llama a esta función (lib/queue/drain.ts), después de recibir la
 * respuesta.
 */
export async function runAgentTurn(conversationId: string): Promise<ResultadoTurno> {
  const db = supabaseAdmin();
  const inicio = Date.now();

  const { data: conversacion, error: errorConv } = await db
    .from('conversations')
    .select('id, org_id, contact_id, ia_activa')
    .eq('id', conversationId)
    .single();
  if (errorConv || !conversacion)
    throw errorConv ?? new Error('Conversación no encontrada');
  if (!conversacion.ia_activa) return { respuesta: null, toolsLlamadas: [] };

  const leadId = await obtenerOCrearLead(
    db,
    conversacion.org_id,
    conversacion.contact_id,
  );

  const { data: org } = await db
    .from('organizations')
    .select('name')
    .eq('id', conversacion.org_id)
    .single();

  const { data: mensajesPrevios, error: errorMsgs } = await db
    .from('messages')
    .select('direction, sender_type, type, text, timestamp')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(MAX_MENSAJES_HISTORIAL);
  if (errorMsgs) throw errorMsgs;

  const historial = (mensajesPrevios ?? []).reverse();

  const ctx: ToolContext = {
    orgId: conversacion.org_id,
    conversationId,
    contactId: conversacion.contact_id,
    leadId,
  };

  const { ANTHROPIC_API_KEY } = envAnthropic();
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const systemPrompt = construirSystemPrompt({
    nombreOrganizacion: org?.name ?? 'la inmobiliaria',
    fechaHoyLima: new Date().toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });

  // Por ahora solo se manda texto al modelo — mensajes con media (imagen,
  // audio, etc.) quedan para una fase posterior que resuelva la descarga
  // y el envío como contenido multimodal real.
  const mensajesClaude: Anthropic.MessageParam[] = historial
    .filter((m) => m.text != null)
    .map((m) => ({
      role: m.direction === 'entrante' ? ('user' as const) : ('assistant' as const),
      content: m.text!,
    }));

  if (mensajesClaude.length === 0) {
    return { respuesta: null, toolsLlamadas: [] };
  }

  const toolsLlamadas: string[] = [];
  let tokensEntrada = 0;
  let tokensSalida = 0;
  let respuestaFinal: string | null = null;

  for (let turno = 0; turno < MAX_TURNOS_HERRAMIENTA; turno++) {
    const respuesta = await anthropic.messages.create({
      model: MODELO,
      max_tokens: 1024,
      system: systemPrompt,
      tools: definicionesParaClaude(),
      messages: mensajesClaude,
    });

    tokensEntrada += respuesta.usage.input_tokens;
    tokensSalida += respuesta.usage.output_tokens;

    const bloquesTexto = respuesta.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text);
    const bloquesTool = respuesta.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (bloquesTexto.length > 0) respuestaFinal = bloquesTexto.join('\n');
    if (bloquesTool.length === 0) break;

    mensajesClaude.push({ role: 'assistant', content: respuesta.content });

    const resultadosTool: Anthropic.ToolResultBlockParam[] = [];
    for (const bloque of bloquesTool) {
      toolsLlamadas.push(bloque.name);
      const tool = TOOLS_POR_NOMBRE.get(bloque.name);

      if (!tool) {
        resultadosTool.push({
          type: 'tool_result',
          tool_use_id: bloque.id,
          content: JSON.stringify({ error: `Tool desconocida: ${bloque.name}` }),
          is_error: true,
        });
        continue;
      }

      try {
        const input = tool.inputSchema.parse(bloque.input);
        const resultado = await tool.execute(input, ctx);
        resultadosTool.push({
          type: 'tool_result',
          tool_use_id: bloque.id,
          content: JSON.stringify(resultado),
        });
      } catch (error) {
        resultadosTool.push({
          type: 'tool_result',
          tool_use_id: bloque.id,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
          is_error: true,
        });
      }
    }

    mensajesClaude.push({ role: 'user', content: resultadosTool });

    if (respuesta.stop_reason !== 'tool_use') break;
  }

  await db.from('agent_runs').insert({
    org_id: conversacion.org_id,
    conversation_id: conversationId,
    lead_id: leadId,
    input: { mensajes_en_historial: historial.length },
    tools_called: toolsLlamadas,
    output: respuestaFinal,
    tokens_entrada: tokensEntrada,
    tokens_salida: tokensSalida,
    latencia_ms: Date.now() - inicio,
    modelo: MODELO,
  });

  return { respuesta: respuestaFinal, toolsLlamadas };
}
