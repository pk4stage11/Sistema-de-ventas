'use client';

import { useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconBuilding,
  IconCheck,
  IconClock,
  IconRefresh,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { Chip } from '@/components/ui/chip';
import { Badge } from '@/components/ui/badge';
import { VISITAS_MOCK, type VisitaAgenda } from './mock-data';

type FiltroAgenda = 'todas' | 'pendiente' | 'resuelta';

const FILTROS: { id: FiltroAgenda; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'resuelta', label: 'Realizadas' },
];

function agruparPorFecha(visitas: VisitaAgenda[]): [string, VisitaAgenda[]][] {
  const grupos = new Map<string, VisitaAgenda[]>();
  for (const v of visitas) {
    const lista = grupos.get(v.fecha) ?? [];
    lista.push(v);
    grupos.set(v.fecha, lista);
  }
  return Array.from(grupos.entries());
}

export function ListaVisitas() {
  const [filtro, setFiltro] = useState<FiltroAgenda>('todas');

  const visitas = useMemo(() => {
    if (filtro === 'todas') return VISITAS_MOCK;
    if (filtro === 'pendiente')
      return VISITAS_MOCK.filter((v) => v.asistencia === 'pendiente');
    return VISITAS_MOCK.filter((v) => v.asistencia !== 'pendiente');
  }, [filtro]);

  const grupos = useMemo(() => agruparPorFecha(visitas), [visitas]);

  return (
    <div>
      <div className="flex gap-2">
        {FILTROS.map(({ id, label }) => (
          <Chip key={id} active={filtro === id} onClick={() => setFiltro(id)}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-6">
        {grupos.length === 0 ? (
          <p className="text-texto-sutil py-10 text-center text-sm">
            No hay visitas en este filtro.
          </p>
        ) : (
          grupos.map(([fecha, items]) => (
            <section key={fecha}>
              <h2 className="text-texto-tenue text-xs font-semibold tracking-wide uppercase">
                {fecha}
              </h2>
              <div className="mt-2.5 flex flex-col gap-3">
                {items.map((v) => (
                  <article
                    key={v.id}
                    className="border-borde flex items-center gap-4 rounded-2xl border bg-white p-4"
                  >
                    <div className="flex w-20 shrink-0 items-center gap-1.5 text-[13px] font-semibold">
                      <IconClock size={15} className="text-marca-500" />
                      {v.hora}
                    </div>

                    <div className="bg-marca-50 text-marca-600 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {v.iniciales}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{v.cliente}</span>
                        {v.syncStatus !== 'sincronizado' && (
                          <Badge
                            variant={v.syncStatus === 'error' ? 'error' : 'reservado'}
                            icon={
                              v.syncStatus === 'error' ? (
                                <IconAlertTriangle size={12} />
                              ) : (
                                <IconRefresh size={12} />
                              )
                            }
                          >
                            {v.syncStatus === 'error'
                              ? 'Error con Google Calendar'
                              : 'Sincronizando…'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-texto-sutil mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <IconBuilding size={13} className="text-marca-500" />
                        {v.proyecto} · {v.unidad}
                        <span className="text-borde">·</span>
                        <IconUser size={13} className="text-marca-500" />
                        {v.asesor}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {v.asistencia === 'pendiente' ? (
                        <div className="flex gap-2">
                          <span className="border-borde text-texto-sutil rounded-pill flex items-center gap-1 border px-3 py-1.5 text-xs font-medium">
                            <IconCheck size={13} /> Asistió
                          </span>
                          <span className="border-borde text-texto-sutil rounded-pill flex items-center gap-1 border px-3 py-1.5 text-xs font-medium">
                            <IconX size={13} /> No asistió
                          </span>
                        </div>
                      ) : (
                        <Badge
                          variant={
                            v.asistencia === 'asistio'
                              ? 'disponible'
                              : v.asistencia === 'no_asistio'
                                ? 'error'
                                : 'reservado'
                          }
                        >
                          {v.asistencia === 'asistio'
                            ? 'Asistió'
                            : v.asistencia === 'no_asistio'
                              ? 'No asistió'
                              : 'Reprogramada'}
                        </Badge>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
