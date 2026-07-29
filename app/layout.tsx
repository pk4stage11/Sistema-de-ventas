import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Plataforma de Agentes IA — Inmobiliaria',
    template: '%s · Agentes IA',
  },
  description:
    'Atención de leads inmobiliarios por WhatsApp, Messenger, Instagram y landing, con calificación automática y agendamiento de visitas.',
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
    <html lang="es-PE">
      <body>{children}</body>
    </html>
  );
}
