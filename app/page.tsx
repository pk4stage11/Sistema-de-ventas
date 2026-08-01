const fases = [
  { id: 'Fase 0', titulo: 'Scaffolding y tooling', estado: 'listo' },
  { id: 'Fase 1', titulo: 'Esquema de datos, RLS y seed', estado: 'listo' },
  { id: 'Fase 2', titulo: 'Ingesta WhatsApp + landing y cola', estado: 'pendiente' },
  { id: 'Fase 3', titulo: 'Bandeja unificada con Realtime', estado: 'pendiente' },
  { id: 'Fase 4', titulo: 'Agente con tool use y RAG', estado: 'pendiente' },
  { id: 'Fase 4.5', titulo: 'Agenda y Google Calendar', estado: 'pendiente' },
  { id: 'Fase 5', titulo: 'Handoff y plantillas de WhatsApp', estado: 'pendiente' },
  { id: 'Fase 6', titulo: 'Cotizaciones y cierre de reserva', estado: 'pendiente' },
  { id: 'Fase 7', titulo: 'Dashboard, hardening y despliegue', estado: 'pendiente' },
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-marca-600 text-sm font-medium tracking-wide uppercase">
        Plataforma interna · InteresArte
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Agentes de IA para atención y agendamiento de leads inmobiliarios
      </h1>
      <p className="text-texto-sutil mt-4 max-w-prose leading-relaxed">
        Atiende leads de WhatsApp y formularios de landing, los califica y los lleva
        hasta una visita agendada con un asesor. El cierre de la venta lo revisa y
        confirma una persona. Messenger e Instagram quedan para una etapa posterior.
      </p>

      <section className="mt-12" aria-labelledby="avance">
        <h2 id="avance" className="font-serif text-lg font-semibold">
          Avance del desarrollo
        </h2>
        <ol className="divide-borde rounded-panel border-borde mt-4 divide-y overflow-hidden border bg-white">
          {fases.map((fase) => (
            <li key={fase.id} className="flex items-center gap-4 px-4 py-3 text-sm">
              <span className="text-texto-sutil w-16 shrink-0 text-xs font-semibold tracking-wide uppercase">
                {fase.id}
              </span>
              <span className="flex-1">{fase.titulo}</span>
              <span
                className={
                  fase.estado === 'listo'
                    ? 'bg-marca-100 text-marca-700 rounded-pill px-2.5 py-0.5 text-xs font-medium'
                    : 'bg-fondo text-texto-sutil rounded-pill px-2.5 py-0.5 text-xs font-medium'
                }
              >
                {fase.estado === 'listo' ? 'Listo' : 'Pendiente'}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-texto-tenue mt-8 text-xs">
        Vista previa de la bandeja:{' '}
        <a href="/inbox" className="text-marca-600 underline underline-offset-2">
          /inbox
        </a>
      </p>
    </main>
  );
}
