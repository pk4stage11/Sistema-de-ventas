'use client';

import { useMemo, useState } from 'react';
import {
  IconBrandWhatsapp,
  IconBuilding,
  IconFileText,
  IconFilter,
  IconMail,
  IconPhone,
} from '@tabler/icons-react';
import { Chip } from '@/components/ui/chip';
import { Badge } from '@/components/ui/badge';
import { CONSULTAS_MOCK, type EstadoConsulta } from './mock-data';

const FILTROS: { id: EstadoConsulta | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'nuevo', label: 'Nuevas' },
  { id: 'contactada', label: 'Contactadas' },
  { id: 'cerrada', label: 'Cerradas' },
];

export function ListaConsultas() {
  const [filtro, setFiltro] = useState<EstadoConsulta | 'todas'>('todas');

  const consultas = useMemo(
    () =>
      filtro === 'todas'
        ? CONSULTAS_MOCK
        : CONSULTAS_MOCK.filter((c) => c.estado === filtro),
    [filtro],
  );

  const nuevas = CONSULTAS_MOCK.filter((c) => c.estado === 'nuevo').length;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(({ id, label }) => {
          const total =
            id === 'todas'
              ? CONSULTAS_MOCK.length
              : id === 'nuevo'
                ? nuevas
                : undefined;
          return (
            <Chip key={id} active={filtro === id} onClick={() => setFiltro(id)}>
              {label}
              {total !== undefined && <span className="opacity-60">{total}</span>}
            </Chip>
          );
        })}
        <Chip className="ml-auto" disabled>
          <IconFilter size={15} /> Por propiedad
        </Chip>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {consultas.length === 0 ? (
          <p className="text-texto-sutil py-10 text-center text-sm">
            No hay consultas en este filtro.
          </p>
        ) : (
          consultas.map((c) => (
            <article
              key={c.id}
              className={
                'border-borde flex gap-3.5 rounded-2xl border bg-white p-4' +
                (c.estado === 'nuevo' ? ' border-marca-500' : '') +
                (c.estado === 'cerrada' ? ' opacity-70' : '')
              }
            >
              <div
                className={
                  'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
                  (c.estado === 'cerrada'
                    ? 'bg-fondo text-texto-sutil'
                    : 'bg-marca-50 text-marca-600')
                }
              >
                {c.iniciales}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-semibold">{c.nombre}</span>
                  {c.canal === 'whatsapp' ? (
                    <Badge variant="whatsapp" icon={<IconBrandWhatsapp size={12} />}>
                      WhatsApp
                    </Badge>
                  ) : (
                    <Badge variant="formulario" icon={<IconFileText size={12} />}>
                      Formulario
                    </Badge>
                  )}
                  <Badge variant={c.estado}>{c.estado.toUpperCase()}</Badge>
                  <span className="text-texto-tenue ml-auto text-[11px]">
                    {c.recibidoHace}
                  </span>
                </div>

                <p className="text-texto-sutil mt-1.5 text-[13px]">“{c.mensaje}”</p>

                <div className="text-texto-sutil mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <IconBuilding size={14} className="text-marca-500" />
                  {c.interes}
                  <span className="text-borde">·</span>
                  {c.contacto.includes('@') ? (
                    <IconMail size={14} className="text-marca-500" />
                  ) : (
                    <IconPhone size={14} className="text-marca-500" />
                  )}
                  {c.contacto}
                </div>
              </div>

              <div className="flex shrink-0 flex-col justify-center gap-2">
                {c.estado === 'cerrada' ? (
                  <span className="border-borde rounded-pill text-texto-sutil border px-3.5 py-2 text-center text-xs font-medium">
                    Ver conversación
                  </span>
                ) : (
                  <>
                    <span className="bg-whatsapp rounded-pill flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white">
                      <IconBrandWhatsapp size={14} /> Responder
                    </span>
                    <span className="border-borde rounded-pill text-texto-sutil border px-3.5 py-2 text-center text-xs font-medium">
                      Marcar atendida
                    </span>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
