import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'whatsapp'
  | 'formulario'
  | 'nuevo'
  | 'contactada'
  | 'cerrada'
  | 'disponible'
  | 'reservado'
  | 'vendido'
  | 'error';

const ESTILOS: Record<BadgeVariant, string> = {
  whatsapp: 'bg-whatsapp-badge-bg text-whatsapp-badge-texto',
  formulario: 'bg-form-badge-bg text-form-badge-texto',
  nuevo: 'bg-marca-500 text-white',
  contactada: 'bg-fondo text-texto-sutil',
  cerrada: 'bg-fondo text-texto-tenue',
  disponible: 'bg-disponible-bg text-disponible-texto',
  reservado: 'bg-reservado-bg text-reservado-texto',
  vendido: 'bg-vendido-bg text-vendido-texto',
  error: 'bg-error-bg text-error-texto',
};

interface BadgeProps {
  variant: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Pill de una sola palabra: canal de origen, estado del lead, de la unidad o de la visita. */
export function Badge({ variant, icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold',
        ESTILOS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
