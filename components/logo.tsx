import { cn } from '@/lib/utils';

/** Isotipo de InteresArte: "Interes Arte" con las dos "e" en teal itálica. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-serif text-lg font-bold text-white', className)}>
      Inter<em className="text-marca-400 italic">e</em>s Art
      <em className="text-marca-400 italic">e</em>
    </span>
  );
}
