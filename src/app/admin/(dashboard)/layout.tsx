import { requireAdmin } from '@/lib/requireAdmin';
import { SessionProvider } from 'next-auth/react';
import { AdminShellClient } from '@/components/admin-shell-client';

// This is a SERVER component — requireAdmin runs on the server before any HTML is sent
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth guard: redirects to login if not admin
  await requireAdmin();

  return (
    <SessionProvider>
      <AdminShellClient>{children}</AdminShellClient>
    </SessionProvider>
  );
}

