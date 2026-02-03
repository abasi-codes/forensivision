import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { DocsSidebar } from '@/components/docs/docs-sidebar';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 mr-6">
            <Logo size={32} />
            <span className="text-xl font-bold">ForensiVision</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">/</span>
            <Link
              href="/docs"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Docs
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="flex">
        <DocsSidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
