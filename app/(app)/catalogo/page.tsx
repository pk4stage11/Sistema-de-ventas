import type { Metadata } from 'next';
import { IconPlus } from '@tabler/icons-react';
import { TablaUnidades } from './tabla-unidades';
import { UNIDADES_MOCK } from './mock-data';

export const metadata: Metadata = { title: 'Catálogo' };

export default function CatalogoPage() {
  const disponibles = UNIDADES_MOCK.filter((u) => u.estado === 'disponible').length;
  const reservadas = UNIDADES_MOCK.filter((u) => u.estado === 'reservado').length;
  const vendidas = UNIDADES_MOCK.filter((u) => u.estado === 'vendido').length;

  return (
    <main className="px-7.5 py-6.5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[26px] font-bold">Catálogo</h1>
          <p className="text-texto-sutil mt-0.5 text-sm">
            {UNIDADES_MOCK.length} unidades · {disponibles} disponibles · {reservadas}{' '}
            reservada{reservadas === 1 ? '' : 's'} · {vendidas} vendida
            {vendidas === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          disabled
          className="bg-tinta-950 rounded-pill flex items-center gap-1.5 px-5 py-3 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          <IconPlus size={16} /> Nueva unidad
        </button>
      </div>

      <div className="mt-5">
        <TablaUnidades />
      </div>
    </main>
  );
}
