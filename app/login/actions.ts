'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface EstadoLogin {
  error?: string;
}

export async function login(
  _estadoPrevio: EstadoLogin | undefined,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = formData.get('email');
  const password = formData.get('password');
  const redirectTo = formData.get('redirect');

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email ||
    !password
  ) {
    return { error: 'Completa correo y contraseña.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: 'Correo o contraseña incorrectos.' };
  }

  redirect(typeof redirectTo === 'string' && redirectTo ? redirectTo : '/inbox');
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
