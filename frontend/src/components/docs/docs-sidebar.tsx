'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href?: string;
  items?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Quick Start', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', href: '/docs/endpoints' },
      { title: 'POST Analyze Image', href: '/docs/endpoints/analyze-image' },
      { title: 'POST Analyze Video', href: '/docs/endpoints/analyze-video' },
      { title: 'POST Batch Analysis', href: '/docs/endpoints/analyze-batch' },
      { title: 'GET Results', href: '/docs/endpoints/results' },
      { title: 'GET Usage', href: '/docs/endpoints/usage' },
      { title: 'POST Webhooks', href: '/docs/endpoints/webhooks' },
      { title: 'GET Models', href: '/docs/endpoints/models' },
      { title: 'POST Cancel', href: '/docs/endpoints/cancel' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Webhook Setup', href: '/docs/webhooks' },
      { title: 'Rate Limits', href: '/docs/rate-limits' },
      { title: 'Error Handling', href: '/docs/errors' },
      { title: 'Response Types', href: '/docs/types' },
    ],
  },
];

function NavSection({ section, pathname }: { section: NavItem; pathname: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasActiveChild = section.items?.some((item) => item.href === pathname);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-semibold text-foreground py-2"
      >
        {section.title}
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && section.items && (
        <ul className="ml-2 border-l pl-4 space-y-1">
          {section.items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href!}
                className={cn(
                  'block py-1.5 text-sm transition-colors',
                  pathname === item.href
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
        aria-label="Open navigation"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-16 z-50 lg:z-0',
          'w-64 h-[calc(100vh-4rem)] overflow-y-auto',
          'bg-white dark:bg-slate-950 border-r',
          'transition-transform lg:transform-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>

        <nav className="p-6">
          {navigation.map((section) => (
            <NavSection key={section.title} section={section} pathname={pathname} />
          ))}
        </nav>
      </aside>
    </>
  );
}
