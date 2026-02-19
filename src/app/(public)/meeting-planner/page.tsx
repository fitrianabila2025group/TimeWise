import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/settings';
import { MeetingPlannerClient } from '@/components/meeting-planner-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  return {
    title: 'Meeting Planner — Find the Best Time Across Time Zones',
    description: 'Plan meetings across 2–8 cities. Find the best overlapping work hours with our timezone-aware meeting planner.',
    alternates: { canonical: `${siteUrl}/meeting-planner` },
  };
}

export default function MeetingPlannerPage() {
  return (
    <div className="container px-4 md:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2">Meeting Planner</h1>
      <p className="text-muted-foreground mb-6">
        Find the perfect meeting time across multiple time zones. Add 2–8 cities and we&apos;ll find the best overlap.
      </p>
      <MeetingPlannerClient />
    </div>
  );
}
