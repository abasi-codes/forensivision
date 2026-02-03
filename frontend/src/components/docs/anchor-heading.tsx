'use client';

import { Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnchorHeadingProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function AnchorHeading({
  as: Component = 'h2',
  id,
  children,
  className,
}: AnchorHeadingProps) {
  const sizes = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-semibold',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-medium',
  };

  return (
    <Component
      id={id}
      className={cn('group flex items-center gap-2 scroll-mt-20', sizes[Component], className)}
    >
      {children}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Link to ${children}`}
      >
        <Link2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </a>
    </Component>
  );
}
