'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconBuildingCommunity,
  IconCalendarEvent,
  IconClipboardCheck,
  IconLayoutDashboard,
  IconMessages,
  IconSettings,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: IconLayoutDashboard },
  { href: '/catalogo', label: 'Catálogo', icon: IconBuildingCommunity },
  { href: '/inbox', label: 'Bandeja', icon: IconMessages, badge: 5 },
  { href: '/agenda', label: 'Agenda', icon: IconCalendarEvent },
  { href: '/reservas', label: 'Reservas', icon: IconClipboardCheck },
  { href: '/ajustes', label: 'Ajustes', icon: IconSettings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-tinta-950 flex w-[236px] shrink-0 flex-col p-4">
      <div className="px-2.5 pt-1.5 pb-5">
        <Logo />
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, ...item }) => {
          const activo = pathname.startsWith(href);
          const badge = 'badge' in item ? item.badge : undefined;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[13.5px] font-medium',
                activo ? 'bg-tinta-900 text-white' : 'text-white/70 hover:text-white',
              )}
            >
              <Icon size={18} className={activo ? 'text-marca-400' : undefined} />
              {label}
              {badge ? (
                <span className="bg-marca-500 ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="bg-tinta-900 mt-auto flex items-center gap-2.5 rounded-[10px] p-2.5">
        <div className="bg-marca-400 text-marca-700 flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
          CA
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold text-white">
            Cristhian A.
          </div>
          <div className="text-[10px] text-white/50">Administrador</div>
        </div>
      </div>
    </aside>
  );
}
