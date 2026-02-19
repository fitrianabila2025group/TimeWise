import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { getSiteUrl } from '@/lib/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

async function getMeeting(slug: string) {
  const meeting = await prisma.meetingShare.findUnique({ where: { slug } });
  if (!meeting) return null;

  const cityIds = JSON.parse(meeting.cityIds) as string[];
  const cities = await prisma.city.findMany({
    where: { id: { in: cityIds } },
    include: { timezone: true },
  });

  return { meeting, cities };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getMeeting(params.slug);
  if (!data) return {};
  const siteUrl = await getSiteUrl();
  return {
    title: `Meeting — ${data.cities.map((c: any) => c.name).join(', ')}`,
    description: `Shared meeting across ${data.cities.length} cities.`,
    alternates: { canonical: `${siteUrl}/meeting/${params.slug}` },
  };
}

export default async function MeetingPage({ params }: Props) {
  const data = await getMeeting(params.slug);
  if (!data) notFound();

  const { meeting, cities } = data;
  const meetingDate = new Date(meeting.dateTimeISO);

  return (
    <div className="container px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        Shared Meeting
      </h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Meeting Times</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {meetingDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="space-y-3">
            {cities.map((city: any) => {
              const localTime = new Intl.DateTimeFormat('en-US', {
                timeZone: city.timezone.ianaName,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }).format(meetingDate);

              return (
                <div key={city.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{city.name}, {city.countryName}</p>
                    <p className="text-xs text-muted-foreground">{city.timezone.ianaName}</p>
                  </div>
                  <Badge variant="outline" className="text-base font-mono">
                    {localTime}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Link href={`/api/meeting/${params.slug}/ics`}>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download .ics
          </Button>
        </Link>
        <Link href="/meeting-planner">
          <Button variant="ghost">
            <Clock className="h-4 w-4 mr-2" />
            Plan New Meeting
          </Button>
        </Link>
      </div>
    </div>
  );
}
