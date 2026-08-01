'use client';

import { useEffect, useState } from 'react';
import {
  IconBuildingCommunity,
  IconMail,
  IconPhone,
  IconRobot,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import type { ConversacionItem } from './tipos';

interface LeadInfo {
  estado: string;
  proyectoNombre: string | null;
}

const ESTADO_LEGIBLE: Record<string, string> = {
  nuevo: 'Nuevo',
  calificando: 'Calificando',
  calificado: 'Calificado',
  cita_agendada: 'Cita agendada',
  visita_realizada: 'Visita realizada',
  cita_no_asistida: 'No asistió a la cita',
  cita_reprogramada: 'Cita reprogramada',
  propuesta_enviada: 'Propuesta enviada',
  reserva_pendiente: 'Reserva pendiente',
  cerrado_ganado: 'Cerrado — ganado',
  cerrado_perdido: 'Cerrado — perdido',
  derivado_humano: 'Derivado a humano',
};

export function PanelLead({ conversacion }: { conversacion: ConversacionItem | null }) {
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();

    (async () => {
      if (!conversacion) {
        if (!cancelado) setLead(null);
        return;
      }

      setCargando(true);
      setLead(null);

      const { data: leadRow } = await supabase
        .from('leads')
        .select('estado, project_id')
        .eq('contact_id', conversacion.contactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelado) return;
      if (!leadRow) {
        setLead(null);
        setCargando(false);
        return;
      }

      let proyectoNombre: string | null = null;
      if (leadRow.project_id) {
        const { data: proyecto } = await supabase
          .from('projects')
          .select('name')
          .eq('id', leadRow.project_id)
          .maybeSingle();
        proyectoNombre = proyecto?.name ?? null;
      }

      if (!cancelado) {
        setLead({ estado: leadRow.estado, proyectoNombre });
        setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [conversacion]);

  if (!conversacion) {
    return <aside className="w-[300px] shrink-0 bg-white" />;
  }

  return (
    <aside className="border-borde w-[300px] shrink-0 overflow-y-auto border-l bg-white p-5">
      <h2 className="font-serif text-base font-bold">Datos del lead</h2>

      <div className="mt-4 space-y-2.5 text-[13px]">
        {conversacion.contactTelefono ? (
          <div className="text-texto-sutil flex items-center gap-2">
            <IconPhone size={15} className="text-marca-500 shrink-0" />
            {conversacion.contactTelefono}
          </div>
        ) : null}
        {conversacion.contactEmail ? (
          <div className="text-texto-sutil flex items-center gap-2">
            <IconMail size={15} className="text-marca-500 shrink-0" />
            {conversacion.contactEmail}
          </div>
        ) : null}
      </div>

      <div className="border-borde mt-5 border-t pt-4">
        <h3 className="text-texto-tenue text-xs font-semibold tracking-wide uppercase">
          Calificación
        </h3>

        {cargando ? (
          <p className="text-texto-sutil mt-2 text-xs">Cargando…</p>
        ) : lead ? (
          <div className="mt-2.5 space-y-2">
            <span className="bg-marca-500 rounded-pill inline-block px-2.5 py-1 text-xs font-semibold text-white">
              {ESTADO_LEGIBLE[lead.estado] ?? lead.estado}
            </span>
            {lead.proyectoNombre ? (
              <div className="text-texto-sutil flex items-center gap-2 text-[13px]">
                <IconBuildingCommunity size={15} className="text-marca-500 shrink-0" />
                {lead.proyectoNombre}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-texto-sutil mt-2.5 flex items-start gap-2 text-xs leading-relaxed">
            <IconRobot size={15} className="text-texto-tenue mt-0.5 shrink-0" />
            Todavía no lo calificó el agente de IA.
          </div>
        )}
      </div>
    </aside>
  );
}
