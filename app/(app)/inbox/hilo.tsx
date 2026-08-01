'use client';

import { useEffect, useRef } from 'react';
import {
  IconAlertCircle,
  IconBrandWhatsapp,
  IconClockHour4,
  IconFileText,
  IconRobot,
  IconUserCircle,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { horasDesde, tiempoRelativo } from '@/lib/format/relative-time';
import type { TipoMensaje } from '@/lib/channels/types';
import type { ConversacionItem, MensajeItem } from './tipos';

const VENTANA_WHATSAPP_HORAS = 24;

const ETIQUETA_POR_TIPO: Partial<Record<TipoMensaje, string>> = {
  imagen: '📷 Imagen',
  audio: '🎤 Audio',
  video: '🎥 Video',
  documento: '📄 Documento',
  ubicacion: '📍 Ubicación',
  contacto: '👤 Contacto compartido',
  sticker: '🙂 Sticker',
  sistema: 'Mensaje del sistema',
  no_soportado: 'Mensaje no compatible',
};

function contenidoMensaje(m: MensajeItem): string {
  if (m.text) return m.text;
  return ETIQUETA_POR_TIPO[m.type] ?? '(sin contenido)';
}

interface HiloProps {
  conversacion: ConversacionItem | null;
  mensajes: MensajeItem[];
  cargando: boolean;
}

export function Hilo({ conversacion, mensajes, cargando }: HiloProps) {
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes.length]);

  if (!conversacion) {
    return (
      <div className="text-texto-sutil flex flex-1 items-center justify-center text-sm">
        Selecciona una conversación para ver el hilo.
      </div>
    );
  }

  const ultimoEntrante = [...mensajes]
    .reverse()
    .find((m) => m.direction === 'entrante');
  const horasVentana = ultimoEntrante ? horasDesde(ultimoEntrante.timestamp) : null;
  const ventanaAbierta = horasVentana === null || horasVentana < VENTANA_WHATSAPP_HORAS;

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="border-borde flex items-center gap-2.5 border-b px-5 py-3.5">
        <div>
          <div className="text-[14px] font-semibold">{conversacion.contactNombre}</div>
          <div className="text-texto-sutil flex items-center gap-1 text-xs">
            {conversacion.channelType === 'whatsapp' ? (
              <>
                <IconBrandWhatsapp size={12} /> WhatsApp
              </>
            ) : (
              <>
                <IconFileText size={12} /> Formulario web
              </>
            )}
          </div>
        </div>

        {conversacion.channelType === 'whatsapp' && ultimoEntrante ? (
          <span
            className={cn(
              'rounded-pill ml-auto flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold',
              ventanaAbierta
                ? 'bg-disponible-bg text-disponible-texto'
                : 'bg-error-bg text-error-texto',
            )}
            title="Ventana de servicio de WhatsApp: fuera de 24 h desde el último mensaje del cliente, solo se puede responder con plantilla aprobada."
          >
            <IconClockHour4 size={12} />
            {ventanaAbierta ? 'Ventana de 24h abierta' : 'Ventana de 24h cerrada'}
          </span>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {cargando ? (
          <p className="text-texto-sutil text-center text-sm">Cargando mensajes…</p>
        ) : mensajes.length === 0 ? (
          <p className="text-texto-sutil text-center text-sm">
            Todavía no hay mensajes.
          </p>
        ) : (
          mensajes.map((m) => {
            const esContacto = m.senderType === 'contacto';
            const esIa = m.senderType === 'ia';
            return (
              <div
                key={m.id}
                className={cn('flex', esContacto ? 'justify-start' : 'justify-end')}
              >
                <div
                  className={cn(
                    'max-w-[65%] rounded-2xl px-3.5 py-2.5 text-[13.5px]',
                    esContacto && 'bg-fondo rounded-bl-sm',
                    esIa && 'bg-marca-50 text-marca-700 rounded-br-sm',
                    !esContacto && !esIa && 'bg-tinta-950 rounded-br-sm text-white',
                  )}
                >
                  {!esContacto ? (
                    <div
                      className={cn(
                        'mb-1 flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase',
                        esIa ? 'text-marca-600' : 'text-white/60',
                      )}
                    >
                      {esIa ? <IconRobot size={11} /> : <IconUserCircle size={11} />}
                      {esIa ? 'Agente IA' : 'Asesor'}
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap">{contenidoMensaje(m)}</p>
                  <div
                    className={cn(
                      'mt-1 text-right text-[10px]',
                      esContacto || esIa ? 'text-texto-tenue' : 'text-white/50',
                    )}
                  >
                    {tiempoRelativo(m.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={finRef} />
      </div>

      <div className="border-borde text-texto-tenue flex items-center gap-2 border-t px-5 py-3 text-xs">
        <IconAlertCircle size={14} />
        Responder desde acá llega en una fase posterior — por ahora es de solo lectura.
      </div>
    </div>
  );
}
