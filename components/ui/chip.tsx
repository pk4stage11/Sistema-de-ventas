import { cn } from '@/lib/utils';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Chip de filtro (ej. "Todas / Nuevas / Contactadas"), toggleable. */
export function Chip({ active, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-pill inline-flex items-center gap-1.5 border px-4 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border-tinta-950 bg-tinta-950 text-white'
          : 'text-texto border-borde enabled:hover:border-marca-500 bg-white',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
