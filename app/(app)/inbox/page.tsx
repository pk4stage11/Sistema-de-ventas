import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Bandeja } from './bandeja';
import type { ConversacionItem } from './tipos';

export const metadata: Metadata = { title: 'Bandeja' };

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();
  if (!perfil) redirect('/login');

  const { data: filas, error } = await supabase
    .from('conversation_list')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;

  const conversaciones: ConversacionItem[] = (filas ?? []).map((f) => ({
    id: f.id,
    contactId: f.contact_id,
    contactNombre: f.contact_nombre ?? 'Sin nombre',
    contactTelefono: f.contact_telefono,
    contactEmail: f.contact_email,
    channelType: f.channel_type,
    iaActiva: f.ia_activa,
    lastMessageAt: f.last_message_at,
    ultimoMensajeTexto: f.ultimo_mensaje_texto,
    ultimoMensajeDireccion: f.ultimo_mensaje_direccion,
  }));

  return <Bandeja orgId={perfil.org_id} conversacionesIniciales={conversaciones} />;
}
