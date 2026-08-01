/**
 * Seed de desarrollo: una inmobiliaria ficticia con un proyecto y ~20
 * unidades (Fase 1). Es idempotente — se puede correr varias veces sin
 * duplicar filas — y usa el cliente service_role (bypassa RLS a propósito,
 * es un script de servidor de confianza, no algo que corra en el navegador).
 *
 * Uso: npm run db:seed
 */
import 'dotenv/config';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type UnidadInsert = Database['public']['Tables']['units']['Insert'];

const NOMBRE_ORGANIZACION = 'Inmobiliaria Costa Perú SAC';
const NOMBRE_PROYECTO = 'Edificio Vista Mar';

const TIPOLOGIAS = [
  { tipologia: 'Flat 1 dormitorio', dormitorios: 1, banos: 1, m2: 45 },
  { tipologia: 'Flat 2 dormitorios', dormitorios: 2, banos: 2, m2: 68 },
  { tipologia: 'Flat 3 dormitorios', dormitorios: 3, banos: 2, m2: 92 },
  { tipologia: 'Dúplex 3 dormitorios', dormitorios: 3, banos: 3, m2: 120 },
] as const;

const PRECIO_POR_M2_SOLES = 8500;
const PISO_INICIAL = 3;
const UNIDADES_POR_PISO = 2;
const TOTAL_UNIDADES = 20;

async function obtenerOCrearOrganizacion(
  db: ReturnType<typeof supabaseAdmin>,
): Promise<string> {
  const { data: existente, error: errorBusqueda } = await db
    .from('organizations')
    .select('id')
    .eq('name', NOMBRE_ORGANIZACION)
    .maybeSingle();
  if (errorBusqueda) throw errorBusqueda;
  if (existente) return existente.id;

  const { data: creada, error: errorCreacion } = await db
    .from('organizations')
    .insert({ name: NOMBRE_ORGANIZACION })
    .select('id')
    .single();
  if (errorCreacion) throw errorCreacion;
  return creada.id;
}

async function obtenerOCrearProyecto(
  db: ReturnType<typeof supabaseAdmin>,
  orgId: string,
): Promise<string> {
  const { data: existente, error: errorBusqueda } = await db
    .from('projects')
    .select('id')
    .eq('org_id', orgId)
    .eq('name', NOMBRE_PROYECTO)
    .maybeSingle();
  if (errorBusqueda) throw errorBusqueda;
  if (existente) return existente.id;

  const { data: creado, error: errorCreacion } = await db
    .from('projects')
    .insert({
      org_id: orgId,
      name: NOMBRE_PROYECTO,
      distrito: 'Miraflores',
      direccion: 'Av. Malecón de la Reserva 1234, Miraflores, Lima',
      descripcion:
        'Edificio residencial de 12 pisos frente al malecón, con vista al mar desde los departamentos orientados al oeste.',
      fecha_entrega: '2027-06-30',
      avance_obra: 'Casco terminado, en etapa de acabados (65%)',
      areas_comunes: [
        'Piscina',
        'Gimnasio',
        'Coworking',
        'Terraza BBQ',
        'Salón de eventos',
      ],
    })
    .select('id')
    .single();
  if (errorCreacion) throw errorCreacion;
  return creado.id;
}

function generarUnidades(orgId: string, projectId: string): UnidadInsert[] {
  const unidades: UnidadInsert[] = [];

  for (let i = 0; i < TOTAL_UNIDADES; i++) {
    const piso = PISO_INICIAL + Math.floor(i / UNIDADES_POR_PISO);
    const posicionEnPiso = (i % UNIDADES_POR_PISO) + 1;
    const codigo = `${piso}0${posicionEnPiso}`;
    const tipologia = TIPOLOGIAS[i % TIPOLOGIAS.length]!;
    const factorVista = 1 + (piso - PISO_INICIAL) * 0.01; // pisos altos, algo más caros
    const precio = Math.round(tipologia.m2 * PRECIO_POR_M2_SOLES * factorVista);

    unidades.push({
      org_id: orgId,
      project_id: projectId,
      codigo,
      tipologia: tipologia.tipologia,
      m2: tipologia.m2,
      dormitorios: tipologia.dormitorios,
      banos: tipologia.banos,
      piso,
      precio,
      // Un par de unidades ya colocadas, para que el seed no se vea vacío.
      estado: i === 0 ? 'vendido' : i === 1 ? 'reservado' : 'disponible',
    });
  }

  return unidades;
}

async function main() {
  const db = supabaseAdmin();

  console.log(`Organización: ${NOMBRE_ORGANIZACION}`);
  const orgId = await obtenerOCrearOrganizacion(db);
  console.log(`  id = ${orgId}`);

  console.log(`Proyecto: ${NOMBRE_PROYECTO}`);
  const projectId = await obtenerOCrearProyecto(db, orgId);
  console.log(`  id = ${projectId}`);

  const unidades = generarUnidades(orgId, projectId);
  const { data: unidadesGuardadas, error: errorUnidades } = await db
    .from('units')
    .upsert(unidades, { onConflict: 'project_id,codigo' })
    .select('codigo, estado');
  if (errorUnidades) throw errorUnidades;

  console.log(
    `Unidades: ${unidadesGuardadas?.length ?? 0} guardadas (upsert por código).`,
  );
  console.log('Seed completo.');
}

main().catch((error: unknown) => {
  console.error('Falló el seed:', error);
  process.exitCode = 1;
});
