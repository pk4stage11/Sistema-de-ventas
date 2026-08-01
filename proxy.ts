import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { envPublic } from '@/lib/env';

const RUTAS_PUBLICAS = ['/login'];

/**
 * Refresca la sesión de Supabase en cada request (los tokens expiran) y
 * redirige a /login a quien no tenga sesión e intente entrar a una ruta
 * protegida. Las rutas de API quedan afuera a propósito: los webhooks de
 * Meta y el drenador se autentican con su propio secreto, no con sesión de
 * usuario.
 *
 * Se llama `proxy.ts` (no `middleware.ts`): Next 16 renombró la
 * convención — el archivo `middleware.ts` sigue funcionando pero emite un
 * warning de deprecación.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = envPublic();

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaPublica =
    pathname === '/' || RUTAS_PUBLICAS.some((r) => pathname.startsWith(r));
  const esRutaApi = pathname.startsWith('/api');

  if (!user && !esRutaPublica && !esRutaApi) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
