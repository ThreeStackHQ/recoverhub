'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, AlertCircle, Link2, Settings, RefreshCw, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Failed Payments', href: '/failed-payments', icon: AlertCircle },
  { title: 'Retry Queue', href: '/retries', icon: RefreshCw, badge: '3' },
  { title: 'Dunning Emails', href: '/dunning', icon: Mail },
  { title: 'Connections', href: '/connections', icon: Link2 },
  { title: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarNavProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function SidebarNav({ collapsed = false, onCollapse }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full border-r border-white/[0.06] bg-[#0d1221] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]', collapsed && 'justify-center px-0')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ef4343]">
          <RefreshCw className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-base font-bold text-white tracking-tight">RecoverHub</span>
            <div className="text-[10px] text-[#8892A7] -mt-0.5">Payment Recovery</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {!collapsed && (
          <div className="px-2 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8892A7]/60">Menu</span>
          </div>
        )}
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                collapsed && 'justify-center px-0 py-2.5',
                isActive
                  ? 'bg-[#ef4343]/15 text-[#ef4343]'
                  : 'text-[#8892A7] hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn('shrink-0 h-4 w-4', isActive ? 'text-[#ef4343]' : 'text-[#8892A7] group-hover:text-white')} />
              {!collapsed && <span className="flex-1">{item.title}</span>}
              {!collapsed && item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ef4343]/20 text-[#ef4343] border border-[#ef4343]/30">
                  {item.badge}
                </span>
              )}
              {isActive && !collapsed && (
                <div className="absolute left-0 w-0.5 h-6 bg-[#ef4343] rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/[0.06] p-2">
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className={cn('flex items-center gap-2 w-full h-8 px-2 rounded-lg text-[#8892A7] hover:text-white hover:bg-white/5 transition-colors text-sm', collapsed && 'justify-center')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
