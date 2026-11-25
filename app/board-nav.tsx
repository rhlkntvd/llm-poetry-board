'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BoardNav() {
  const path = usePathname();
  return <nav className="board-nav" aria-label="Main navigation">
    {Object.entries({ '/': 'Board', '/archive': 'Archive', '/statistics': 'Statistics' }).map(([href, label]) =>
      <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>
    )}
  </nav>;
}
