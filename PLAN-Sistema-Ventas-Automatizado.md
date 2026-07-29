# Plan Consolidado — Sistema de Ventas Automatizado Omnicanal

> **Fecha de elaboración:** 10 de julio de 2026
> **Última actualización:** 21 de julio de 2026 (CRM/bandeja omnicanal construida a medida en Next.js + Supabase; pasarelas de pago)
> **Estado:** Planificación (antes de desarrollo)
> **Elaborado para:** Cristhian Alayo

---

## 1. Resumen Ejecutivo

**Nombre del proyecto:** Motor de Ventas IA Omnicanal (nombre provisional: _"VentaBot"_)

**Objetivo principal:** Captar prospectos de forma legal y agresiva vía Meta (WhatsApp + Instagram) y landing pages/formularios propios, calificarlos automáticamente con Claude, agendar llamadas de venta, cobrar en línea — todo 24/7 — y darles seguimiento en una **bandeja/CRM propia (construida a medida)** donde tú y hasta 3 agentes de venta ven, responden y clasifican cada lead.

**Tipo de usuario/empresa destino:** Emprendedor/startup unipersonal (con hasta 3 agentes de venta adicionales) que vende múltiples productos (cursos, apps móviles, sistemas ad hoc, productos de consumo).

**Decisión de producto:** La bandeja/CRM se **construye a medida** (no se usa una herramienta lista como Chatwoot) para tener control total del producto, la UX y la propiedad del código. Stack elegido: **Next.js + Supabase**, con **n8n** como capa de integración/automatización y **Claude** como cerebro de IA.

**Principio rector:** La agresividad vive en el _marketing_ (ofertas, creativos, velocidad de respuesta y follow-ups), **no** en el spam masivo desde cuentas nuevas — ese camino resulta en baneo de cuentas en 24-72h y quema de presupuesto.

---

## 2. Especificación Funcional

### Inputs (entradas del sistema)

- **Mensajes entrantes** de prospectos vía WhatsApp Cloud API e Instagram/Messenger API (el prospecto escribe primero → legal).
- **Leads de campañas** de Meta Ads (Lead Ads / Click-to-WhatsApp).
- **Envíos de formularios y landing pages ya existentes** (webhook hacia el CRM — no requiere construir landing nuevas).
- **Eventos de pago** de la pasarela (pago exitoso/rechazado) vía webhook.
- **Catálogo de productos** (definido por ti): nombre, precio, oferta, objeciones frecuentes, guion de venta.
- **Disponibilidad de calendario** (slots libres para llamadas).
- **Configuración de horarios y días de atención** del agente IA por canal.

### Outputs (salidas del sistema)

- **Respuestas conversacionales** automáticas y personalizadas por producto.
- **Clasificación de leads:** caliente / tibio / frío / descartado, con score, mediante **etiquetas**.
- **Bandeja unificada de conversaciones (a medida)**: WhatsApp, Instagram, Facebook y formularios/landing en un solo lugar, en tiempo real, con la conversación real de WhatsApp abierta y respondible dentro del mismo módulo.
- **Seguimiento del ciclo de vida del lead** (nuevo → contactado → agendado → cerrado/perdido) con vista tipo pipeline.
- **Citas agendadas** + notificación a ti.
- **Follow-ups automáticos** (hasta 3-4 toques).
- **Cobro en línea** desde las landing (pasarela de pago) con el pago cerrando el ciclo del lead.
- **Dashboard** de leads, conversaciones y conversión.
- **Control de redes sociales**: bandeja de DMs/comentarios (incluida arriba), programación de publicaciones y métricas básicas.

---

## 3. Dificultades y Riesgos

| Riesgo                                                                      | Impacto | Mitigación                                                                                                                                      |
| --------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Baneo de cuentas por spam**                                               | Alto    | Usar APIs oficiales; el prospecto siempre inicia; respetar ventana de 24h de WhatsApp.                                                          |
| **Construir la bandeja a medida toma más tiempo que una herramienta lista** | Alto    | Stack productivo (Next.js + Supabase con realtime y auth listos); generar gran parte del código con IA; construir por fases (primero WhatsApp). |
| **Tiempo real y sincronización de mensajes**                                | Medio   | Usar Supabase Realtime (websockets nativos) en vez de programar sockets desde cero; idempotencia por `channel_message_id`.                      |
| **Presupuesto ads limitado (<$300)**                                        | Medio   | Ads pequeños de prueba + captación orgánica.                                                                                                    |
| **Alucinaciones de la IA en precios/promesas**                              | Medio   | Prompts con datos fijos; Claude nunca inventa precios; validación de reglas.                                                                    |
| **Costos de API descontrolados**                                            | Medio   | Haiku para filtrar; Sonnet solo para cierre; límites de tokens y rate-limit.                                                                    |
| **Aprobación de WhatsApp Business**                                         | Medio   | Verificar el negocio en Meta con anticipación.                                                                                                  |
| **Dependencia de un solo desarrollador**                                    | Medio   | Código y flujos documentados; n8n visual para integraciones; base de datos y auth gestionadas por Supabase.                                     |

---

## 4. Requerimientos

### 4.1 Técnicos (stack recomendado)

| Capa                                  | Tecnología                                                                 | Rol                                                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend / UI del CRM**             | **Next.js (App Router) + React + Tailwind + shadcn/ui**                    | La bandeja, el pipeline de leads, la config de horarios/etiquetas y el panel del agente IA                                                       |
| **Backend / BD / Auth / Realtime**    | **Supabase** (PostgreSQL + Auth + Realtime + Storage + Row Level Security) | Persistencia de contactos/conversaciones/mensajes, login de agentes, permisos, actualización en vivo de la bandeja, almacenamiento de multimedia |
| Orquestación / integración de canales | **n8n** (self-hosted, Docker)                                              | Recibe webhooks de WhatsApp/Instagram/formularios/pagos, normaliza y escribe en Supabase; envía respuestas salientes; orquesta a Claude          |
| Inteligencia                          | **Claude API** — Haiku 4.5 (filtro) + Sonnet (cierre)                      | Calificación y conversación                                                                                                                      |
| WhatsApp                              | **WhatsApp Cloud API** (oficial, Meta)                                     | Canal principal de cierre                                                                                                                        |
| Instagram / Facebook                  | **Instagram / Messenger API** (Meta Graph)                                 | Canales secundarios                                                                                                                              |
| Formularios / landing pages           | Webhook → n8n → Supabase                                                   | Landing existentes apuntan su envío al webhook                                                                                                   |
| **Pasarela de pago**                  | **Culqi (tarjetas) + Yape** (recomendado para Perú)                        | Cobro en línea desde las landing; webhook de pago hacia n8n                                                                                      |
| Calendario                            | **Cal.com** (open source) o Google Calendar API                            | Agendamiento de llamadas                                                                                                                         |
| Redes sociales (publicar + métricas)  | **Metricool** (u alternativa de bajo costo)                                | Calendario de publicaciones y analítica por red — no se construye a medida                                                                       |
| Infraestructura                       | **VPS Hostinger** (KVM 2) + hosting del frontend                           | VPS aloja n8n + Cal.com; el CRM Next.js se despliega en Vercel (free/hobby) o en el propio VPS                                                   |

### 4.2 Funcionales

**MVP (Fase 1) — WhatsApp + IA:**

1. Recepción de mensajes de WhatsApp.
2. Calificación automática con Claude (score + categoría).
3. Respuesta conversacional para 1 producto.
4. Agendamiento en calendario para leads calientes.
5. Notificación a ti cuando se agenda una cita.

**Bandeja/CRM a medida (Fase 2) — Next.js + Supabase:** 6. Bandeja unificada en tiempo real: WhatsApp, Instagram, Facebook y formularios/landing en un solo lugar. 7. Conversación real de WhatsApp abierta y respondible dentro del módulo (hilo completo de mensajes + multimedia). 8. Configuración de horarios y días de atención del agente IA (fuera de horario → deriva a humano o pausa IA). 9. Etiquetado de leads y campos personalizados (producto de interés, origen, score). 10. Seguimiento del lead por etapas (vista pipeline: nuevo → contactado → agendado → cerrado/perdido). 11. Login multi-agente (tú + hasta 3), asignación de conversaciones y permisos (Supabase Auth + RLS). 12. Panel del agente IA: encender/apagar la IA por conversación, ver qué respondió, tomar el control manual.

**Secundarias (Fase 3):** 13. Follow-ups automáticos multi-toque. 14. Multi-producto (Claude detecta qué producto ofrecer). 15. Cobro en línea integrado (pasarela) que cierra el ciclo del lead. 16. Dashboard de métricas y conversión. 17. Integración de Meta Ads (Lead Ads). 18. Programación de contenido y métricas de redes sociales (Metricool).

### 4.3 No Funcionales

- **Disponibilidad:** 24/7, respuesta en < 10 segundos, bandeja en tiempo real.
- **Seguridad:** claves de API en variables de entorno; HTTPS; RLS de Supabase por agente; backups diarios; nunca exponer tokens de Meta en el frontend.
- **Compliance:** consentimiento (el usuario escribe primero); políticas de Meta; protección de datos.
- **Mantenibilidad:** flujos documentados en n8n; prompts versionados; migraciones de BD versionadas; componentes de UI reutilizables.

---

## 5. Bandeja Omnicanal y CRM — Construida a Medida (Next.js + Supabase)

### 5.1 Por qué a medida y con este stack

Se decidió construir el CRM a medida para tener control total del producto y del código. **Next.js + Supabase** es el stack más productivo para lograrlo: Supabase entrega de fábrica base de datos PostgreSQL, autenticación de agentes, permisos por fila (RLS), almacenamiento de archivos y — clave para una bandeja — **Realtime** (mensajes que aparecen al instante sin recargar). Gran parte del código es generable con IA, lo que reduce el tiempo de desarrollo.

### 5.2 Arquitectura de flujo

```
Canales (WhatsApp / Instagram / Messenger / Formularios / Pago)
        │  (webhooks)
        ▼
      n8n  ── normaliza el evento, aplica reglas de horario, decide si responde la IA
        │        │
        │        └──► Claude API (Haiku filtra / Sonnet cierra)
        ▼
     Supabase  (contacts, conversations, messages, labels, ...)
        │  (Realtime / websockets)
        ▼
   CRM Next.js  ◄── tú y los agentes ven y responden en vivo
        │  (agente responde)
        ▼
      n8n  ── envía el mensaje saliente por la API del canal correspondiente
```

- **Entrada:** cada canal envía su webhook a n8n. n8n normaliza (un mismo formato para todos), guarda el mensaje en Supabase y, si corresponde por horario y por el toggle de IA, llama a Claude y guarda/─envía la respuesta.
- **Bandeja en vivo:** el CRM en Next.js se suscribe a la tabla `messages` de Supabase vía Realtime; los mensajes nuevos aparecen al instante.
- **Salida:** cuando un agente responde desde el CRM, se guarda el mensaje y n8n lo despacha por la API del canal (WhatsApp/IG). El `channel_message_id` evita duplicados.

### 5.3 Modelo de datos (tablas principales en Supabase)

| Tabla                              | Campos clave                                                                                                                | Rol                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `contacts`                         | id, nombre, teléfono, ig_handle, origen, score, stage, campos personalizados (jsonb)                                        | El lead / prospecto                             |
| `conversations`                    | id, contact_id, canal, agente_asignado_id, estado, `ia_activa` (bool), ultimo_mensaje_at                                    | Un hilo por contacto y canal                    |
| `messages`                         | id, conversation_id, dirección (in/out), remitente (contacto/agente/ia), cuerpo, media_url, timestamp, `channel_message_id` | Historial completo del chat                     |
| `labels` + `conversation_labels`   | id, nombre, color                                                                                                           | Etiquetas (caliente/tibio/frío, producto, etc.) |
| `pipeline_stages`                  | id, nombre, orden                                                                                                           | Etapas de seguimiento del lead                  |
| `agents` (perfil sobre auth.users) | id, nombre, rol                                                                                                             | Agentes de venta + permisos                     |
| `business_hours`                   | canal, día, hora_inicio, hora_fin, activo                                                                                   | Horarios y días de atención del agente IA       |

### 5.4 Cómo se cubre cada requisito pedido

| Requisito pedido                               | Cómo se implementa a medida                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Bandeja única de mensajes                      | Vista de conversaciones que lee todos los canales desde `conversations`/`messages`, filtrable por canal/agente/etiqueta |
| Abrir la conversación de WhatsApp en el módulo | Panel de chat que renderiza el hilo `messages` (texto + multimedia desde Supabase Storage) y permite responder          |
| Capturar formularios y landing pages           | Webhook de la landing → n8n → crea contacto+conversación                                                                |
| Horarios y días de respuesta                   | Tabla `business_hours`; n8n consulta antes de dejar responder a la IA                                                   |
| Etiquetas de leads                             | `labels` + campos personalizados en `contacts`                                                                          |
| Seguimiento de leads (pipeline)                | `pipeline_stages` + vista Kanban/lista filtrada por `stage`                                                             |
| Multi-agente con asignación                    | Supabase Auth + RLS; `agente_asignado_id` en la conversación                                                            |
| Control del agente IA                          | Toggle `ia_activa` por conversación; el CRM lo prende/apaga y n8n lo respeta                                            |

### 5.5 Control de redes sociales

1. **DMs/comentarios** → dentro de la propia bandeja (Instagram + Messenger como canales).
2. **Programación/publicación de contenido** → **Metricool** (u alternativa de bajo costo). No se construye a medida.
3. **Métricas/analítica** → dashboard incluido en Metricool.

---

## 6. Pasarelas de Pago (para las landing pages)

Como vendes B2C con tickets bajos-medios en Perú, la jugada estándar es **combinar 2 métodos** en el checkout, no elegir uno solo.

| Pasarela         | Comisión aprox.         | Yape                         | Mensualidad | Integración               | Mejor para                              |
| ---------------- | ----------------------- | ---------------------------- | ----------- | ------------------------- | --------------------------------------- |
| **Culqi**        | ~3.44% + USD 0.20 + IGV | ❌ (no procesa Yape directo) | No          | Muy fácil (API/checkout)  | Tarjetas online, empezar rápido         |
| **Izipay**       | desde ~3.29% + IGV      | ✅                           | No          | Media (orientada a POS)   | Menor comisión, o si quieres POS físico |
| **Mercado Pago** | ~3.79-3.99% + S/1       | ✅                           | No          | Muy fácil, checkout listo | Vender rápido, acreditación inmediata   |
| **Niubiz**       | Negociable por volumen  | ✅                           | Según plan  | Corporativa/pesada        | Alto volumen                            |
| **Yape Empresa** | ~2.95%                  | ✅                           | No          | Simple (botón/link)       | Billetera digital, tickets bajos        |

**Recomendación:** **Culqi (tarjetas) + Yape (billetera)** para cubrir casi todo el mercado peruano con integración rápida y sin mensualidad. Evalúa **Izipay** si te importa la comisión más baja o quieres POS físico; **Mercado Pago** si priorizas velocidad de montaje.

**Integración con la arquitectura:** landing muestra el botón de pago → al **pago exitoso** la pasarela dispara un **webhook a n8n** → n8n marca el contacto como `cliente-pagado`, mueve el lead a "cerrado/ganado" y (opcional) manda WhatsApp de bienvenida + te notifica. Así el pago **cierra el ciclo del lead** dentro del CRM en vez de quedar aislado en la landing.

> Comisiones a julio de 2026; verificar tarifas vigentes al contratar.

---

## 7. Análisis de Infraestructura y Costos

### Opción 1 — Hostinger Premium (hosting compartido) ❌ No viable

- No permite Docker ni procesos persistentes (n8n). Descartado como núcleo. Sí puede seguir sirviendo las landing pages estáticas/WordPress existentes.

### Opción 2 — Hostinger VPS ✅ Recomendado para n8n + Cal.com

- **KVM 2:** 2 vCPU, 8 GB RAM, 100 GB NVMe. Costo ~$7-8/mes promo (renovación ~$14-16/mes). Suficiente porque el CRM ya **no** corre pesado en el VPS: la BD/auth/realtime viven en Supabase, y el frontend puede ir en Vercel. El VPS solo carga n8n + Cal.com.

### Opción 3 — Hosting del CRM y la base de datos

| Componente                          | Opción recomendada        | Costo                                         | Alternativa                                                                                   |
| ----------------------------------- | ------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Base de datos + Auth + Realtime** | **Supabase Cloud (Free)** | **$0** (500 MB BD, auth y realtime incluidos) | Supabase Pro $25/mes al escalar; o Supabase self-hosted en el VPS ($0 pero más mantenimiento) |
| **Frontend Next.js**                | **Vercel (Hobby)**        | **$0** para empezar                           | Vercel Pro $20/mes; o self-host en el VPS con Docker ($0 extra)                               |
| **n8n + Cal.com**                   | VPS Hostinger KVM 2       | incluido en el VPS                            | —                                                                                             |

### Costos de operación variables

| Concepto                  | Costo estimado     | Nota                                                                         |
| ------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| **Claude API**            | ~$10-40/mes        | Haiku barato para calificar; Sonnet solo en cierres.                         |
| **WhatsApp Cloud API**    | Variable           | Servicio (24h) suele ser gratis; marketing/utilidad ~$0.03-0.08 c/u en Perú. |
| **Supabase**              | $0 → $25/mes       | Free para arrancar; Pro al crecer datos/tráfico.                             |
| **Vercel**                | $0 → $20/mes       | Hobby para arrancar; Pro si es uso comercial intenso.                        |
| **Comisión de pasarela**  | ~3-4% por venta    | No es costo fijo; sale de cada transacción cobrada.                          |
| **Metricool** (o similar) | ~$0-45/mes         | Gratis limitado; plan de pago según redes.                                   |
| **Dominio**               | ~$1/mes            | ~$10-15/año.                                                                 |
| **Meta Ads**              | Tú decides (<$300) | Presupuesto de medios, aparte.                                               |

### Resumen de Costos Totales

| Escenario                                                                     | Costo fijo mensual | + variables                            |
| ----------------------------------------------------------------------------- | ------------------ | -------------------------------------- |
| **Base para arrancar** (VPS KVM2 + Supabase Free + Vercel Hobby + Claude API) | **~$20-50/mes**    | + comisión de pasarela por venta + ads |
| **Con redes sociales gestionadas** (+ Metricool)                              | ~$35-95/mes        | + comisión + ads                       |
| **Escalado** (Supabase Pro + Vercel Pro)                                      | ~$65-115/mes       | + comisión + ads                       |

> Estimaciones a julio de 2026; precios de API, ads y suscripciones pueden variar. Buffer del 20%.

---

## 8. Duración Estimada del Proyecto

| Fase                                             | Descripción                                                                                                                             | Duración    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **1. Planificación y accesos**                   | Cuentas Meta, verificar negocio, tokens API, VPS, Supabase, dominio                                                                     | 1 semana    |
| **2. Infraestructura**                           | VPS + Docker + n8n + Cal.com; proyecto Supabase + esquema de tablas                                                                     | 1 semana    |
| **3. Cerebro Claude (MVP WhatsApp)**             | Prompts de calificación/venta del primer producto; flujo n8n de WhatsApp; agendamiento                                                  | 1.5 semanas |
| **4. Bandeja/CRM a medida — base**               | Next.js + Supabase Auth; layout de bandeja; realtime; hilo de WhatsApp; responder desde el CRM                                          | 2.5 semanas |
| **5. Bandeja/CRM a medida — funcional completo** | Etiquetas, campos personalizados, pipeline de seguimiento, horarios (business hours), multi-agente + asignación, panel de control de IA | 2.5 semanas |
| **6. Multicanal**                                | Sumar Instagram, Messenger y formularios/landing a la bandeja; pasarela de pago (webhook → cierre de lead)                              | 2 semanas   |
| **7. Fase final**                                | Follow-ups multi-toque, multi-producto, dashboard, ads (Lead Ads), redes sociales (Metricool), optimización                             | 2.5 semanas |

### Timeline Total

- **MVP WhatsApp + IA (Fases 1-3):** ~3.5 semanas
- **MVP + Bandeja/CRM a medida (Fases 1-5):** ~8.5 semanas (~2 meses)
- **Sistema completo (Fases 1-7):** ~13 semanas (~3 meses)
- **Con buffer del 20%:** ~15.5 semanas

**Fechas estimadas (desde el 21 de julio de 2026):**

- MVP WhatsApp: **~14 de agosto de 2026**
- MVP + Bandeja/CRM a medida: **~18 de septiembre de 2026**
- Sistema completo: **~20 de octubre de 2026**

**Consideraciones que pueden cambiar la duración:** aprobación de Meta; complejidad de los guiones de venta; tu tiempo para pruebas; que la bandeja a medida siempre lleva más iteración de UI que una herramienta lista.

---

## 9. Requisitos de Cuentas y Accesos (checklist previo)

- [ ] **Meta Business Suite** — cuenta de negocio verificada.
- [ ] **Cuenta de Instagram profesional** (Business/Creator) vinculada a una página de Facebook.
- [ ] **Página de Facebook** del negocio.
- [ ] **WhatsApp Business Platform (Cloud API)** — número dedicado.
- [ ] **App en Meta for Developers** — tokens de WhatsApp e Instagram/Messenger.
- [ ] **Cuenta de Claude API** (Anthropic Console) con clave y saldo.
- [ ] **VPS Hostinger** contratado.
- [ ] **Proyecto Supabase** creado (BD + Auth + Realtime + Storage).
- [ ] **Cuenta Vercel** (o decisión de self-host del Next.js en el VPS).
- [ ] **Dominio** (webhooks HTTPS de n8n/Cal.com y dominio del CRM).
- [ ] **Acceso a las landing pages/formularios existentes** para apuntar el envío al webhook.
- [ ] **Cuenta de pasarela de pago** (Culqi + Yape recomendado) con credenciales de API y webhook.
- [ ] **Cuenta de Metricool** (o alternativa) para redes sociales.
- [ ] **Definición del primer producto** (precio, oferta, objeciones) — ✅ ya lo tienes.

---

## 10. Recomendación Final

**Infraestructura recomendada:** CRM/bandeja **a medida en Next.js (Vercel Hobby o self-host) + Supabase (Free)**, con **n8n** self-hosted en **VPS Hostinger KVM 2** como capa de integración, **Claude API** (Haiku + Sonnet) como cerebro, **WhatsApp Cloud API** + Instagram/Messenger como canales, **Culqi + Yape** como pasarela de pago y **Metricool** para programación/métricas de redes sociales.

**Justificación:**

- Control total del producto y propiedad del código (bandeja a medida, como pediste).
- Stack productivo: Supabase resuelve BD, auth, permisos y tiempo real; Next.js da una UI moderna; gran parte del código se genera con IA.
- Costo fijo mínimo para arrancar (~$20-50/mes) — Supabase Free y Vercel Hobby en $0.
- 100% legal y escalable, sin riesgo de baneo por spam.
- El pago cierra el ciclo del lead dentro del mismo CRM.
- Redes sociales (programar + medir) se resuelven con herramienta especializada barata en vez de construir un módulo propio.

**Próximos pasos sugeridos (en orden):**

1. Gestionar cuentas y accesos del checklist (Sección 9).
2. Montar VPS (n8n + Cal.com) y crear el proyecto Supabase con el esquema de tablas.
3. Construir el "cerebro" Claude con el primer producto (MVP de WhatsApp por n8n).
4. Construir la bandeja/CRM en Next.js + Supabase (base → funcional completo).
5. Sumar Instagram, Messenger, formularios y pasarela de pago.
6. Probar con tráfico real; luego ads y redes sociales (Metricool).

---

_Documento estimativo. Los precios de API, ads, suscripciones (VPS, Supabase, Vercel, Metricool) y comisiones de pasarela pueden variar. Se recomienda validar precios vigentes al momento de contratar._
