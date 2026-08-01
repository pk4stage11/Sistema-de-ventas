'use client';

import { useMemo, useState } from 'react';
import {
  IconBrandWhatsapp,
  IconFileText,
  IconInbox,
  IconSearch,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { tiempoRelativo } from '@/lib/format/relative-time';
import { Chip } from '@/components/ui/chip';
import type { ConversacionItem } from './tipos';

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'landing', label: 'Formulario' },
] as const;

interface ListaProps {
  conversaciones: ConversacionItem[];
  seleccionadaId: string | null;
  onSeleccionar: (id: string) => void;
}

export function Lista({ conversaciones, seleccionadaId, onSeleccionar }: ListaProps) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('todas');
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return conversaciones.filter((c) => {
      const pasaCanal = filtro === 'todas' || c.channelType === filtro;
      const pasaBusqueda =
        texto === '' || c.contactNombre.toLowerCase().includes(texto);
      return pasaCanal && pasaBusqueda;
    });
  }, [conversaciones, filtro, busqueda]);

  return (
    <div className="border-borde flex w-[320px] shrink-0 flex-col border-r bg-white">
      <div className="border-borde border-b p-4">
        <h1 className="font-serif text-lg font-bold">Bandeja</h1>
        <label className="border-borde focus-within:border-marca-500 mt-3 flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px]">
          <IconSearch size={15} className="text-texto-tenue shrink-0" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre…"
            className="text-texto w-full outline-none placeholder:text-current"
          />
        </label>
        <div className="mt-2.5 flex gap-1.5">
          {FILTROS.map(({ id, label }) => (
            <Chip
              key={id}
              active={filtro === id}
              onClick={() => setFiltro(id)}
              className="px-3 py-1.5 text-xs"
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 ? (
          <div className="text-texto-sutil flex flex-col items-center gap-2 px-6 py-16 text-center text-sm">
            <IconInbox size={28} className="text-texto-tenue" />
            No hay conversaciones todavía.
          </div>
        ) : (
          filtradas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSeleccionar(c.id)}
              className={cn(
                'border-borde flex w-full flex-col gap-1 border-b px-4 py-3.5 text-left transition-colors',
                seleccionadaId === c.id ? 'bg-marca-50' : 'hover:bg-fondo',
              )}
            >
              <div className="flex items-center gap-2">
                {c.channelType === 'whatsapp' ? (
                  <IconBrandWhatsapp size={14} className="shrink-0 text-[#25D366]" />
                ) : (
                  <IconFileText size={14} className="text-form-badge-texto shrink-0" />
                )}
                <span className="flex-1 truncate text-[13.5px] font-semibold">
                  {c.contactNombre}
                </span>
                {c.lastMessageAt ? (
                  <span className="text-texto-tenue shrink-0 text-[10.5px]">
                    {tiempoRelativo(c.lastMessageAt)}
                  </span>
                ) : null}
              </div>
              <p className="text-texto-sutil truncate pl-[22px] text-xs">
                {c.ultimoMensajeDireccion === 'saliente' ? 'Tú: ' : ''}
                {c.ultimoMensajeTexto || '(sin texto)'}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
