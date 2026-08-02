import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buscarUnidades } from '@/lib/agent/tools/buscar-unidades';
import { guardarCalificacion } from '@/lib/agent/tools/guardar-calificacion';
import { escalarAHumano } from '@/lib/agent/tools/escalar-a-humano';
import { crearSolicitudReserva } from '@/lib/agent/tools/crear-solicitud-reserva';
import { consultarDisponibilidad } from '@/lib/agent/tools/consultar-disponibilidad';
import type { ToolContext } from '@/lib/agent/tools/types';

describe('tools del agente contra datos reales (sin Claude — DB directo)', () => {
  const admin = supabaseAdmin();
  let orgId: string;
  let conversationId: string;
  let leadId: string;
  let leadSinCalificarId: string;
  let unitId: string;
  let ctx: ToolContext;
  let ctxSinCalificar: ToolContext;

  beforeAll(async () => {
    const { data: org } = await admin
      .from('organizations')
      .insert({ name: `Org Test Tools ${randomUUID()}` })
      .select('id')
      .single();
    orgId = org!.id;

    const { data: channel } = await admin
      .from('channels')
      .insert({ org_id: orgId, type: 'whatsapp', name: 'WhatsApp test' })
      .select('id')
      .single();

    const { data: contact } = await admin
      .from('contacts')
      .insert({ org_id: orgId, full_name: 'Contacto Tools' })
      .select('id')
      .single();

    const { data: conv } = await admin
      .from('conversations')
      .insert({
        org_id: orgId,
        contact_id: contact!.id,
        channel_id: channel!.id,
        external_thread_id: `test-${randomUUID()}`,
      })
      .select('id')
      .single();
    conversationId = conv!.id;

    const { data: lead } = await admin
      .from('leads')
      .insert({ org_id: orgId, contact_id: contact!.id })
      .select('id')
      .single();
    leadId = lead!.id;

    const { data: leadSinCalificar } = await admin
      .from('leads')
      .insert({ org_id: orgId, contact_id: contact!.id })
      .select('id')
      .single();
    leadSinCalificarId = leadSinCalificar!.id;

    const { data: project } = await admin
      .from('projects')
      .insert({ org_id: orgId, name: 'Proyecto Test Tools', distrito: 'Miraflores' })
      .select('id')
      .single();

    const { data: unit } = await admin
      .from('units')
      .insert({
        org_id: orgId,
        project_id: project!.id,
        codigo: 'T01',
        precio: 300_000,
        dormitorios: 2,
        estado: 'disponible',
      })
      .select('id')
      .single();
    unitId = unit!.id;

    // Regla de disponibilidad amplia (todo el día, cualquier día de la
    // semana) para no depender de en qué día corran los tests.
    const reglas = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
      org_id: orgId,
      dia_semana: dia,
      hora_inicio: '00:00:00',
      hora_fin: '23:30:00',
      duracion_visita_minutos: 30,
      buffer_minutos: 0,
    }));
    await admin.from('availability_rules').insert(reglas);

    ctx = { orgId, conversationId, contactId: contact!.id, leadId };
    ctxSinCalificar = {
      orgId,
      conversationId,
      contactId: contact!.id,
      leadId: leadSinCalificarId,
    };
  });

  afterAll(async () => {
    await admin.from('visits').delete().eq('org_id', orgId);
    await admin.from('reservations').delete().eq('org_id', orgId);
    await admin.from('availability_rules').delete().eq('org_id', orgId);
    await admin.from('lead_qualification').delete().eq('org_id', orgId);
    await admin.from('leads').delete().eq('org_id', orgId);
    await admin.from('units').delete().eq('org_id', orgId);
    await admin.from('projects').delete().eq('org_id', orgId);
    await admin.from('conversations').delete().eq('org_id', orgId);
    await admin.from('contacts').delete().eq('org_id', orgId);
    await admin.from('channels').delete().eq('org_id', orgId);
    await admin.from('organizations').delete().eq('id', orgId);
  });

  it('buscar_unidades encuentra la unidad de prueba por distrito y dormitorios', async () => {
    const resultado = await buscarUnidades.execute(
      { distrito: 'Miraflores', dormitorios: 2 },
      ctx,
    );
    expect(resultado.unidades.length).toBeGreaterThan(0);
    expect(resultado.unidades.some((u) => u.codigo === 'T01')).toBe(true);
  });

  it('crear_solicitud_reserva rechaza si el lead está recién creado (nuevo)', async () => {
    // La máquina de estados lanza (no retorna un {error}) — es una
    // violación de invariante, no una rama de negocio esperable. El
    // orquestador (lib/agent/run.ts) captura cualquier excepción de una
    // tool y se la devuelve a Claude como tool_result de error, así que
    // el agente igual la ve y puede reaccionar.
    await expect(
      crearSolicitudReserva.execute({ unit_id: unitId }, ctxSinCalificar),
    ).rejects.toThrow(/Transición de lead inválida/);
  });

  it('guardar_calificacion crea el registro y avanza el lead a calificando', async () => {
    const resultado = await guardarCalificacion.execute(
      { tipo_inmueble: 'departamento', distrito: 'Miraflores' },
      ctx,
    );
    expect(resultado.guardado).toBe(true);
    expect(resultado.calificacion_completa).toBe(false);

    const { data: lead } = await admin
      .from('leads')
      .select('estado')
      .eq('id', leadId)
      .single();
    expect(lead?.estado).toBe('calificando');
  });

  it('guardar_calificacion completa los campos clave y avanza a calificado', async () => {
    const resultado = await guardarCalificacion.execute(
      { presupuesto_max: 350_000, forma_pago: 'contado' },
      ctx,
    );
    expect(resultado.calificacion_completa).toBe(true);

    const { data: lead } = await admin
      .from('leads')
      .select('estado')
      .eq('id', leadId)
      .single();
    expect(lead?.estado).toBe('calificado');
  });

  it('consultar_disponibilidad devuelve slots con la regla amplia de prueba', async () => {
    const resultado = await consultarDisponibilidad.execute(
      { dias_hacia_adelante: 3 },
      ctx,
    );
    expect('slots' in resultado && resultado.slots.length).toBeGreaterThan(0);
  });

  it('escalar_a_humano pausa la IA y deriva el lead', async () => {
    const resultado = await escalarAHumano.execute(
      { motivo: 'Reclamo de prueba' },
      ctx,
    );
    expect(resultado.escalado).toBe(true);

    const { data: lead } = await admin
      .from('leads')
      .select('estado')
      .eq('id', leadId)
      .single();
    expect(lead?.estado).toBe('derivado_humano');

    const { data: conv } = await admin
      .from('conversations')
      .select('ia_activa')
      .eq('id', conversationId)
      .single();
    expect(conv?.ia_activa).toBe(false);
  });
});
