import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <div className="flex min-h-screen">
      <div className="bg-tinta-950 hidden flex-1 flex-col justify-between p-14 lg:flex">
        <Logo className="text-2xl" />
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold text-white">
            Panel de
            <br />
            <span className="text-marca-400 italic">administración</span>
          </h1>
          <p className="mt-3.5 max-w-[340px] text-[15px] leading-relaxed text-white/60">
            Gestiona tus leads, revisa la bandeja de consultas y acompaña a tus clientes
            hasta la visita agendada.
          </p>
        </div>
        <p className="text-xs text-white/40">© 2026 InteresArte · Grupo Inmobiliario</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-10">
        <div className="w-full max-w-[340px]">
          <h2 className="font-serif text-2xl font-bold">Bienvenido de vuelta</h2>
          <p className="text-texto-sutil mt-1.5 text-sm">
            Ingresa para gestionar tu inmobiliaria
          </p>
          <div className="mt-6">
            <LoginForm redirectTo={redirect ?? '/inbox'} />
          </div>
        </div>
      </div>
    </div>
  );
}
