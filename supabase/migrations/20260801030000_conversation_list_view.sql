-- Vista de conveniencia para la Bandeja: cada conversación con los datos
-- del contacto/canal y el texto del último mensaje. PostgREST no soporta
-- "el último N por grupo" en un solo `select` con embeds, así que se
-- resuelve acá con `distinct on`.
--
-- `security_invoker = true` (a diferencia de calendar_connection_status,
-- que necesita lo contrario): esta vista debe respetar el RLS normal de
-- quien la consulta — un asesor solo debe ver conversaciones de su propia
-- organización, exactamente como si consultara las tablas directo.
create or replace view public.conversation_list
with (security_invoker = true) as
select distinct on (c.id)
  c.id,
  c.org_id,
  c.contact_id,
  c.channel_id,
  c.assigned_user_id,
  c.ia_activa,
  c.estado,
  c.last_message_at,
  ch.type as channel_type,
  ct.full_name as contact_nombre,
  ct.phone as contact_telefono,
  ct.email as contact_email,
  m.text as ultimo_mensaje_texto,
  m.direction as ultimo_mensaje_direccion,
  m.type as ultimo_mensaje_tipo,
  m.timestamp as ultimo_mensaje_timestamp
from public.conversations c
join public.channels ch on ch.id = c.channel_id
join public.contacts ct on ct.id = c.contact_id
left join public.messages m on m.conversation_id = c.id
order by c.id, m.timestamp desc nulls last;

grant select on public.conversation_list to authenticated;
