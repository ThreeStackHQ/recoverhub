'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Bell, ChevronRight, Home } from 'lucide-react';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'failed-payments': 'Failed Payments',
  retries: 'Retry Queue',
  dunning: 'Dunning Emails',
  connections: 'Connections',
  settings: 'Settings',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const segments = pathname.split('/').filter(Boolean);
  const pageTitle = ROUTE_LABELS[segments[segments.length - 1] ?? ''] ?? 'Dashboard';

  const breadcrumbs: { title: string; href: string }[] = [{ title: 'Home', href: '/dashboard' }];
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = ROUTE_LABELS[segment];
    if (label && segment !== 'dashboard') {
      breadcrumbs.push({ title: label, href: currentPath });
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c1022]">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:shrink-0">
        <SidebarNav collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      </div>

      {/* Mobile sidebar */}
      <div className={cn('fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 lg:hidden', mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarNav collapsed={false} onCollapse={() => setMobileSidebarOpen(false)} />
        <button onClick={() => setMobileSidebarOpen(false)} className="absolute top-4 right-4 text-[#8892A7] hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0d1221] px-4 lg:px-6">
          <button className="lg:hidden text-[#8892A7] hover:text-white transition-colors" onClick={() => setMobileSidebarOpen(true)} aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
            <ol className="flex items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />}
                  {i === 0 ? (
                    <a href={crumb.href} className="text-[#8892A7] hover:text-white transition-colors" aria-label="Home">
                      <Home className="h-3.5 w-3.5" />
                    </a>
                  ) : i === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-white truncate">{crumb.title}</span>
                  ) : (
                    <a href={crumb.href} className="text-[#8892A7] hover:text-white transition-colors truncate">{crumb.title}</a>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[#ef4343]/15 border border-[#ef4343]/30 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ef4343] animate-pulse" />
              <span className="text-xs font-medium text-[#ef4343]">Live</span>
            </div>
            <button className="relative p-2 text-[#8892A7] hover:text-white hover:bg-white/5 rounded-lg transition-colors" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#ef4343] rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-6xl px-4 py-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
