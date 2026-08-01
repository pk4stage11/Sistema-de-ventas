'use client';

import { useMemo, useState } from 'react';
import {
  IconDotsVertical,
  IconEdit,
  IconFilter,
  IconPhoto,
  IconSearch,
} from '@tabler/icons-react';
import { Chip } from '@/components/ui/chip';
import { Badge } from '@/components/ui/badge';
import { UNIDADES_MOCK, type EstadoUnidad } from './mock-data';

const FILTROS: { id: EstadoUnidad | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'disponible', label: 'Disponibles' },
  { id: 'reservado', label: 'Reservadas' },
  { id: 'vendido', label: 'Vendidas' },
];

const formatoSoles = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
});

export function TablaUnidades() {
  const [filtro, setFiltro] = useState<EstadoUnidad | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  const unidades = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return UNIDADES_MOCK.filter((u) => {
      const pasaFiltro = filtro === 'todas' || u.estado === filtro;
      const pasaBusqueda =
        texto === '' ||
        u.codigo.toLowerCase().includes(texto) ||
        u.tipologia.toLowerCase().includes(texto) ||
        u.proyecto.toLowerCase().includes(texto) ||
        u.distrito.toLowerCase().includes(texto);
      return pasaFiltro && pasaBusqueda;
    });
  }, [filtro, busqueda]);

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <label className="border-borde text-texto-tenue focus-within:border-marca-500 flex flex-1 items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13px]">
          <IconSearch size={16} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, tipología o proyecto…"
            className="text-texto w-full outline-none placeholder:text-current"
          />
        </label>
        {FILTROS.map(({ id, label }) => (
          <Chip key={id} active={filtro === id} onClick={() => setFiltro(id)}>
            {label}
          </Chip>
        ))}
        <Chip disabled>
          <IconFilter size={15} /> Proyecto
        </Chip>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {['Unidad', 'Proyecto', 'Piso', 'm²', 'Precio', 'Estado', ''].map((h) => (
                <th
                  key={h}
                  className="text-texto-tenue px-3 pb-2.5 text-[11px] font-semibold tracking-wide uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unidades.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-texto-sutil py-10 text-center text-sm">
                  Ninguna unidad coincide con la búsqueda.
                </td>
              </tr>
            ) : (
              unidades.map((u) => (
                <tr key={u.id} className="border-borde border-t">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-fondo text-texto-tenue flex size-10 shrink-0 items-center justify-center rounded-lg">
                        <IconPhoto size={16} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">{u.codigo}</div>
                        <div className="text-texto-sutil text-xs">{u.tipologia}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-texto-sutil px-3 py-3 text-[13px]">
                    {u.proyecto}
                    <div className="text-texto-tenue text-xs">{u.distrito}</div>
                  </td>
                  <td className="text-texto-sutil px-3 py-3 text-[13px]">{u.piso}</td>
                  <td className="text-texto-sutil px-3 py-3 text-[13px]">{u.m2}</td>
                  <td className="px-3 py-3 text-[13px] font-semibold">
                    {formatoSoles.format(u.precio)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={u.estado}>
                      {u.estado === 'disponible'
                        ? 'Disponible'
                        : u.estado === 'reservado'
                          ? 'Reservada'
                          : 'Vendida'}
                    </Badge>
                  </td>
                  <td className="text-texto-tenue px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <IconEdit size={16} />
                      <IconDotsVertical size={16} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
