/**
 * Datos de muestra para previsualizar el Catálogo. Genera las mismas 20
 * unidades que scripts/seed.ts (mismos códigos, tipologías y fórmula de
 * precio) para que la vista previa coincida con lo que realmente hay en la
 * base — sin importar el script del servidor en un componente de cliente.
 */

export type EstadoUnidad = 'disponible' | 'reservado' | 'vendido';

export interface UnidadCatalogo {
  id: string;
  codigo: string;
  proyecto: string;
  distrito: string;
  tipologia: string;
  piso: number;
  m2: number;
  dormitorios: number;
  banos: number;
  precio: number;
  estado: EstadoUnidad;
}

const PROYECTO = 'Edificio Vista Mar';
const DISTRITO = 'Miraflores';

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

function generarUnidades(): UnidadCatalogo[] {
  const unidades: UnidadCatalogo[] = [];

  for (let i = 0; i < TOTAL_UNIDADES; i++) {
    const piso = PISO_INICIAL + Math.floor(i / UNIDADES_POR_PISO);
    const posicionEnPiso = (i % UNIDADES_POR_PISO) + 1;
    const codigo = `${piso}0${posicionEnPiso}`;
    const tipologia = TIPOLOGIAS[i % TIPOLOGIAS.length]!;
    const factorVista = 1 + (piso - PISO_INICIAL) * 0.01;
    const precio = Math.round(tipologia.m2 * PRECIO_POR_M2_SOLES * factorVista);

    unidades.push({
      id: codigo,
      codigo,
      proyecto: PROYECTO,
      distrito: DISTRITO,
      tipologia: tipologia.tipologia,
      piso,
      m2: tipologia.m2,
      dormitorios: tipologia.dormitorios,
      banos: tipologia.banos,
      precio,
      estado: i === 0 ? 'vendido' : i === 1 ? 'reservado' : 'disponible',
    });
  }

  return unidades;
}

export const UNIDADES_MOCK: UnidadCatalogo[] = generarUnidades();
