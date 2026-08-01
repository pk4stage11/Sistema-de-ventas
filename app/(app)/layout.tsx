import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { createClient } from '@/lib/supabase/server';

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '·';
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El middleware ya redirige a /login sin sesión; esto es la segunda capa
  // por si el layout se renderiza sin pasar por el middleware.
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  const nombre = perfil?.full_name ?? user.email ?? 'Usuario';
  const rol = perfil?.role ?? 'asesor';

  return (
    <div className="flex min-h-screen">
      <Sidebar usuario={{ nombre, rol, iniciales: iniciales(nombre) }} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
