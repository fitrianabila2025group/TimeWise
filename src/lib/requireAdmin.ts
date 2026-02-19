import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Server-side guard: call at the top of any admin server component or layout.
 * Redirects to login if not authenticated as ADMIN.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'EDITOR')
  ) {
    redirect('/admin/login');
  }
  return session;
}
