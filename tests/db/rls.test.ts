/**
 * Tests de aislamiento por organización y de permisos por rol, corriendo
 * contra el proyecto Supabase Cloud de desarrollo (no un mock). Crea su
 * propia fixture (dos organizaciones de prueba) y la limpia al terminar,
 * sin tocar los datos del seed (scripts/seed.ts).
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y
 * SUPABASE_SERVICE_ROLE_KEY en .env.local. Ver tests/db/README.md.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { envPublic } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

function clienteAnonimo(): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublic();
  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

interface UsuarioDePrueba {
  userId: string;
  cliente: SupabaseClient<Database>;
}

async function crearUsuarioDePrueba(
  admin: SupabaseClient<Database>,
  orgId: string,
  role: Database['public']['Tables']['users']['Row']['role'],
): Promise<UsuarioDePrueba> {
  const email = `test-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;

  const { data: creado, error: errorCreacion } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (errorCreacion || !creado.user)
    throw errorCreacion ?? new Error('No se creó el usuario');

  const { error: errorPerfil } = await admin
    .from('users')
    .insert({ id: creado.user.id, org_id: orgId, full_name: `Prueba ${role}`, role });
  if (errorPerfil) throw errorPerfil;

  const cliente = clienteAnonimo();
  const { error: errorLogin } = await cliente.auth.signInWithPassword({
    email,
    password,
  });
  if (errorLogin) throw errorLogin;

  return { userId: creado.user.id, cliente };
}

describe('RLS: aislamiento por organización y permisos por rol', () => {
  const admin = supabaseAdmin();

  let orgAId: string;
  let orgBId: string;
  let asesorA: UsuarioDePrueba;
  let adminA: UsuarioDePrueba;
  let contactAId: string;
  let contactBId: string;
  let projectAId: string;
  let unitAId: string;
  let leadAId: string;
  let reservationId: string;

  beforeAll(async () => {
    const { data: orgA, error: errorOrgA } = await admin
      .from('organizations')
      .insert({ name: `Org Test A ${randomUUID()}` })
      .select('id')
      .single();
    if (errorOrgA || !orgA) throw errorOrgA ?? new Error('No se creó orgA');
    orgAId = orgA.id;

    const { data: orgB, error: errorOrgB } = await admin
      .from('organizations')
      .insert({ name: `Org Test B ${randomUUID()}` })
      .select('id')
      .single();
    if (errorOrgB || !orgB) throw errorOrgB ?? new Error('No se creó orgB');
    orgBId = orgB.id;

    asesorA = await crearUsuarioDePrueba(admin, orgAId, 'asesor');
    adminA = await crearUsuarioDePrueba(admin, orgAId, 'admin');

    const { data: contactA, error: errorContactA } = await admin
      .from('contacts')
      .insert({ org_id: orgAId, full_name: 'Contacto A' })
      .select('id')
      .single();
    if (errorContactA || !contactA)
      throw errorContactA ?? new Error('No se creó contactA');
    contactAId = contactA.id;

    const { data: contactB, error: errorContactB } = await admin
      .from('contacts')
      .insert({ org_id: orgBId, full_name: 'Contacto B' })
      .select('id')
      .single();
    if (errorContactB || !contactB)
      throw errorContactB ?? new Error('No se creó contactB');
    contactBId = contactB.id;

    // Cadena mínima para poder crear una reservation: proyecto -> unidad -> lead.
    const { data: project, error: errorProject } = await admin
      .from('projects')
      .insert({ org_id: orgAId, name: `Proyecto Test ${randomUUID()}` })
      .select('id')
      .single();
    if (errorProject || !project)
      throw errorProject ?? new Error('No se creó el proyecto');
    projectAId = project.id;

    const { data: unit, error: errorUnit } = await admin
      .from('units')
      .insert({
        org_id: orgAId,
        project_id: projectAId,
        codigo: `T-${randomUUID().slice(0, 8)}`,
        precio: 100000,
      })
      .select('id')
      .single();
    if (errorUnit || !unit) throw errorUnit ?? new Error('No se creó la unidad');
    unitAId = unit.id;

    const { data: lead, error: errorLead } = await admin
      .from('leads')
      .insert({ org_id: orgAId, contact_id: contactAId })
      .select('id')
      .single();
    if (errorLead || !lead) throw errorLead ?? new Error('No se creó el lead');
    leadAId = lead.id;

    const { data: reservation, error: errorReservation } = await admin
      .from('reservations')
      .insert({ org_id: orgAId, lead_id: leadAId, unit_id: unitAId })
      .select('id')
      .single();
    if (errorReservation || !reservation) {
      throw errorReservation ?? new Error('No se creó la reserva');
    }
    reservationId = reservation.id;
  });

  afterAll(async () => {
    // Se limpia en orden inverso de dependencias. Borrar los auth.users
    // hace cascade sobre public.users por la FK con ON DELETE CASCADE.
    await admin.from('reservations').delete().eq('id', reservationId);
    await admin.from('leads').delete().eq('id', leadAId);
    await admin.from('units').delete().eq('id', unitAId);
    await admin.from('projects').delete().eq('id', projectAId);
    await admin.from('contacts').delete().in('id', [contactAId, contactBId]);
    await admin.auth.admin.deleteUser(asesorA.userId);
    await admin.auth.admin.deleteUser(adminA.userId);
    await admin.from('organizations').delete().in('id', [orgAId, orgBId]);
  });

  it('un asesor de la organización A no ve contactos de la organización B', async () => {
    const { data, error } = await asesorA.cliente
      .from('contacts')
      .select('id')
      .eq('id', contactBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('un asesor de la organización A sí ve sus propios contactos', async () => {
    const { data, error } = await asesorA.cliente
      .from('contacts')
      .select('id')
      .eq('id', contactAId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('un asesor no puede aprobar una reserva', async () => {
    const { data, error } = await asesorA.cliente
      .from('reservations')
      .update({ estado: 'aprobada' })
      .eq('id', reservationId)
      .select();

    // RLS bloquea la fila en silencio: no es un error, son 0 filas afectadas.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: verificacion } = await admin
      .from('reservations')
      .select('estado')
      .eq('id', reservationId)
      .single();
    expect(verificacion?.estado).toBe('pendiente');
  });

  it('un admin sí puede aprobar una reserva', async () => {
    const { data, error } = await adminA.cliente
      .from('reservations')
      .update({ estado: 'aprobada' })
      .eq('id', reservationId)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.estado).toBe('aprobada');
  });

  it('un asesor no puede promoverse a admin', async () => {
    const { error } = await asesorA.cliente
      .from('users')
      .update({ role: 'admin' })
      .eq('id', asesorA.userId);

    expect(error).not.toBeNull();
  });
});
