'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, Globe, MapPin, Link2, FileText, MessageSquare,
  Settings, Users, Shield, BarChart3, Menu, X, LogOut, Megaphone, Clock,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/cities', label: 'Cities', icon: MapPin },
  { href: '/admin/timezones', label: 'Timezones', icon: Clock },
  { href: '/admin/popular-pairs', label: 'Popular Pairs', icon: Link2 },
  { href: '/admin/seo-templates', label: 'SEO Templates', icon: BarChart3 },
  { href: '/admin/faqs', label: 'FAQs', icon: MessageSquare },
  { href: '/admin/internal-links', label: 'Internal Links', icon: Globe },
  { href: '/admin/blog', label: 'Blog Posts', icon: FileText },
  { href: '/admin/ads', label: 'Ads Manager', icon: Megaphone },
  { href: '/admin/site-settings', label: 'Site Settings', icon: Settings },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: Shield },
];

export function AdminShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b">
          <Link href="/admin/dashboard" className="font-bold text-lg">
            ⏰ TimeWise
          </Link>
          <button
            className="lg:hidden p-1 rounded hover:bg-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-2 overflow-y-auto h-[calc(100vh-3.5rem-4rem)]">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">
              {session?.user?.email || 'Admin'}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b flex items-center px-4">
          <button
            className="lg:hidden p-2 rounded hover:bg-accent mr-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground" target="_blank">
            View Site →
          </Link>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
