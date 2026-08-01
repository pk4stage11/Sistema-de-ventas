'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lista } from './lista';
import { Hilo } from './hilo';
import { PanelLead } from './panel-lead';
import type { ConversacionItem, MensajeItem } from './tipos';

function ordenarPorUltimoMensaje(
  conversaciones: ConversacionItem[],
): ConversacionItem[] {
  return [...conversaciones].sort((a, b) => {
    const fechaA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const fechaB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return fechaB - fechaA;
  });
}

export function Bandeja({
  orgId,
  conversacionesIniciales,
}: {
  orgId: string;
  conversacionesIniciales: ConversacionItem[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [conversaciones, setConversaciones] = useState(
    ordenarPorUltimoMensaje(conversacionesIniciales),
  );
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(
    conversacionesIniciales[0]?.id ?? null,
  );
  const [mensajes, setMensajes] = useState<MensajeItem[]>([]);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);

  // La suscripción de Realtime vive todo el ciclo de vida del componente;
  // el callback necesita la conversación seleccionada más reciente sin
  // volver a suscribirse cada vez que cambia — de ahí el ref.
  const seleccionadaRef = useRef(seleccionadaId);
  useEffect(() => {
    seleccionadaRef.current = seleccionadaId;
  }, [seleccionadaId]);

  // Cargar el historial de la conversación seleccionada.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      if (!seleccionadaId) {
        if (!cancelado) setMensajes([]);
        return;
      }

      setCargandoMensajes(true);
      const { data } = await supabase
        .from('messages')
        .select('id, conversation_id, direction, sender_type, type, text, timestamp')
        .eq('conversation_id', seleccionadaId)
        .order('timestamp', { ascending: true });

      if (cancelado) return;
      setMensajes(
        (data ?? []).map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          direction: m.direction,
          senderType: m.sender_type,
          type: m.type,
          text: m.text,
          timestamp: m.timestamp,
        })),
      );
      setCargandoMensajes(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [seleccionadaId, supabase]);

  // Suscripción Realtime: un mensaje nuevo en cualquier conversación de la
  // organización actualiza la lista (previsualización + orden); si además
  // pertenece a la conversación abierta, se agrega al hilo en vivo.
  useEffect(() => {
    const canal = supabase
      .channel(`org-${orgId}-messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const fila = payload.new as {
            id: string;
            conversation_id: string;
            direction: 'entrante' | 'saliente';
            sender_type: 'contacto' | 'ia' | 'humano';
            type: MensajeItem['type'];
            text: string | null;
            timestamp: string;
          };

          if (fila.conversation_id === seleccionadaRef.current) {
            setMensajes((prev) =>
              prev.some((m) => m.id === fila.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: fila.id,
                      conversationId: fila.conversation_id,
                      direction: fila.direction,
                      senderType: fila.sender_type,
                      type: fila.type,
                      text: fila.text,
                      timestamp: fila.timestamp,
                    },
                  ],
            );
          }

          setConversaciones((prev) => {
            const existe = prev.some((c) => c.id === fila.conversation_id);
            if (!existe) {
              // Conversación nueva creada mientras la bandeja estaba abierta
              // (primer mensaje de un contacto nuevo): se trae completa.
              void supabase
                .from('conversation_list')
                .select('*')
                .eq('id', fila.conversation_id)
                .maybeSingle()
                .then(({ data }) => {
                  if (!data) return;
                  setConversaciones((actuales) =>
                    ordenarPorUltimoMensaje([
                      ...actuales,
                      {
                        id: data.id,
                        contactId: data.contact_id,
                        contactNombre: data.contact_nombre ?? 'Sin nombre',
                        contactTelefono: data.contact_telefono,
                        contactEmail: data.contact_email,
                        channelType: data.channel_type,
                        iaActiva: data.ia_activa,
                        lastMessageAt: data.last_message_at,
                        ultimoMensajeTexto: data.ultimo_mensaje_texto,
                        ultimoMensajeDireccion: data.ultimo_mensaje_direccion,
                      },
                    ]),
                  );
                });
              return prev;
            }

            return ordenarPorUltimoMensaje(
              prev.map((c) =>
                c.id === fila.conversation_id
                  ? {
                      ...c,
                      lastMessageAt: fila.timestamp,
                      ultimoMensajeTexto: fila.text,
                      ultimoMensajeDireccion: fila.direction,
                    }
                  : c,
              ),
            );
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [orgId, supabase]);

  const seleccionada = conversaciones.find((c) => c.id === seleccionadaId) ?? null;

  return (
    <div className="flex h-screen">
      <Lista
        conversaciones={conversaciones}
        seleccionadaId={seleccionadaId}
        onSeleccionar={setSeleccionadaId}
      />
      <Hilo
        conversacion={seleccionada}
        mensajes={mensajes}
        cargando={cargandoMensajes}
      />
      <PanelLead conversacion={seleccionada} />
    </div>
  );
}
