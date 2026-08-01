import type { Metadata } from 'next';
import { ListaConsultas } from './lista-consultas';
import { CONSULTAS_MOCK } from './mock-data';

export const metadata: Metadata = { title: 'Bandeja' };

export default function InboxPage() {
  const nuevas = CONSULTAS_MOCK.filter((c) => c.estado === 'nuevo').length;

  return (
    <main className="px-7.5 py-6.5">
      <h1 className="font-serif text-[26px] font-bold">Consultas de clientes</h1>
      <p className="text-texto-sutil mt-0.5 text-sm">
        {CONSULTAS_MOCK.length} esta semana · {nuevas} sin responder
      </p>

      <div className="mt-5">
        <ListaConsultas />
      </div>
    </main>
  );
}
