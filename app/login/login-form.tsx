'use client';

import { useActionState } from 'react';
import { IconLock, IconMail } from '@tabler/icons-react';
import { login, type EstadoLogin } from './actions';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [estado, formAction, pendiente] = useActionState<
    EstadoLogin | undefined,
    FormData
  >(login, undefined);

  return (
    <form action={formAction} className="w-full max-w-[340px]">
      <input type="hidden" name="redirect" value={redirectTo} />

      <label className="mb-1.5 block text-xs font-semibold text-[#444]" htmlFor="email">
        Correo
      </label>
      <div className="border-borde focus-within:border-marca-500 flex items-center gap-2 rounded-[10px] border px-3.5 py-3">
        <IconMail size={16} className="text-texto-tenue shrink-0" />
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@interesarte.pe"
          className="text-texto w-full text-sm outline-none placeholder:text-current"
        />
      </div>

      <label
        className="mt-4 mb-1.5 block text-xs font-semibold text-[#444]"
        htmlFor="password"
      >
        Contraseña
      </label>
      <div className="border-borde focus-within:border-marca-500 flex items-center gap-2 rounded-[10px] border px-3.5 py-3">
        <IconLock size={16} className="text-texto-tenue shrink-0" />
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••"
          className="text-texto w-full text-sm outline-none placeholder:text-current"
        />
      </div>

      {estado?.error ? (
        <p role="alert" className="text-error-texto mt-3 text-xs font-medium">
          {estado.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pendiente}
        className="bg-tinta-950 rounded-pill mt-5 w-full py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {pendiente ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
