-- Canal configurado (un número de WhatsApp, una página de Messenger, una
-- cuenta de Instagram, o el formulario de landing). Los valores de `type`
-- deben coincidir con CANALES en lib/channels/types.ts.
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  type text not null check (type in ('whatsapp', 'messenger', 'instagram', 'landing')),
  name text not null,
  external_id text,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index channels_org_id_idx on public.channels (org_id);

-- Identidad de la persona, independiente del canal por el que escriba.
-- external_ids guarda el identificador por canal, ej.
-- {"whatsapp": "51987654321", "instagram": "17841..."}.
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  full_name text,
  phone text,
  email text,
  external_ids jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_org_id_idx on public.contacts (org_id);
create index contacts_phone_idx on public.contacts (org_id, phone);

create trigger trg_contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- Un hilo por contacto y canal.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  contact_id uuid not null references public.contacts (id),
  channel_id uuid not null references public.channels (id),
  external_thread_id text not null,
  assigned_user_id uuid references public.users (id),
  ia_activa boolean not null default true,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, channel_id, external_thread_id)
);

create index conversations_org_id_idx on public.conversations (org_id);
create index conversations_contact_id_idx on public.conversations (contact_id);
create index conversations_assigned_user_id_idx on public.conversations (assigned_user_id);

-- Historial completo del chat. `message_external_id` es la clave de
-- idempotencia: Meta reintenta los webhooks y no se debe duplicar un
-- mensaje. Los adaptadores de landing sintetizan un id único propio.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  conversation_id uuid not null references public.conversations (id),
  direction text not null check (direction in ('entrante', 'saliente')),
  sender_type text not null check (sender_type in ('contacto', 'ia', 'humano')),
  sender_user_id uuid references public.users (id),
  type text not null check (
    type in (
      'texto', 'imagen', 'audio', 'video', 'documento',
      'ubicacion', 'contacto', 'sticker', 'sistema', 'no_soportado'
    )
  ),
  text text,
  media jsonb not null default '[]'::jsonb,
  message_external_id text not null,
  "timestamp" timestamptz not null,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, message_external_id)
);

create index messages_org_id_idx on public.messages (org_id);
create index messages_conversation_id_idx on public.messages (conversation_id, "timestamp");
