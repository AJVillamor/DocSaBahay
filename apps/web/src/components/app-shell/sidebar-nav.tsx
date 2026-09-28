'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import type { NavItem } from './nav-items';

const itemClassName =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/** Vertical navigation list used by both the desktop sidebar and the mobile drawer. */
export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ label, icon: Icon, href }) => {
        if (!href) {
          return (
            <li key={label}>
              <span className={cn(itemClassName, 'cursor-default text-muted-foreground')}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs">Soon</span>
              </span>
            </li>
          );
        }
        const active = pathname === href;
        return (
          <li key={label}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                itemClassName,
                active ? 'bg-muted font-medium text-foreground' : 'hover:bg-muted/60',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
