import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Plataforma de Agentes IA — InteresArte',
    template: '%s · InteresArte',
  },
  description:
    'Atención de leads inmobiliarios por WhatsApp y landing, con calificación automática y agendamiento de visitas.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Los asesores usan la bandeja desde el celular.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PE" className={cn(inter.variable, fraunces.variable)}>
      <body>{children}</body>
    </html>
  );
}
