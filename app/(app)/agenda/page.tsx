import type { Metadata } from 'next';
import { ListaVisitas } from './lista-visitas';
import { VISITAS_MOCK } from './mock-data';

export const metadata: Metadata = { title: 'Agenda' };

export default function AgendaPage() {
  const pendientes = VISITAS_MOCK.filter((v) => v.asistencia === 'pendiente').length;
  const conProblemaDeSync = VISITAS_MOCK.filter((v) => v.syncStatus === 'error').length;

  return (
    <main className="px-7.5 py-6.5">
      <h1 className="font-serif text-[26px] font-bold">Agenda</h1>
      <p className="text-texto-sutil mt-0.5 text-sm">
        {pendientes} visita{pendientes === 1 ? '' : 's'} pendiente
        {pendientes === 1 ? '' : 's'}
        {conProblemaDeSync > 0 && (
          <span className="text-error-texto">
            {' '}
            · {conProblemaDeSync} sin sincronizar con Google Calendar
          </span>
        )}
      </p>

      <div className="mt-5">
        <ListaVisitas />
      </div>
    </main>
  );
}
