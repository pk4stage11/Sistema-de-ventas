import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';

export function tiempoRelativo(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: es });
}

/** Horas transcurridas desde un timestamp ISO. */
export function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}
