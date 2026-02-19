import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'All Time Zones – IANA Time Zone List | MeetZone',
  description: 'Browse all IANA time zones with their UTC offsets, abbreviations, and cities. Find and compare time zones worldwide.',
  alternates: { canonical: '/timezones' },
};

export const dynamic = 'force-dynamic';

export default async function TimezonesPage() {
  const timezones = await prisma.timezone.findMany({
    include: { _count: { select: { cities: { where: { isActive: true } } } } },
    orderBy: { utcOffsetMinutes: 'asc' },
  });

  // Group by region
  const grouped = timezones.reduce<Record<string, typeof timezones>>((acc: Record<string, typeof timezones>, tz: typeof timezones[number]) => {
    const region = tz.ianaName.split('/')[0] || 'Other';
    if (!acc[region]) acc[region] = [];
    acc[region].push(tz);
    return acc;
  }, {});

  const regions = Object.keys(grouped).sort();

  function formatOffset(minutes: number): string {
    const sign = minutes >= 0 ? '+' : '-';
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Time Zones</h1>
      <p className="text-muted-foreground mb-8">
        Browse {timezones.length} IANA time zones with their UTC offsets.
      </p>

      <div className="flex flex-wrap gap-1 mb-8">
        {regions.map(region => (
          <a
            key={region}
            href={`#${region.toLowerCase()}`}
            className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 transition-colors"
          >
            {region}
          </a>
        ))}
      </div>

      <div className="space-y-8">
        {regions.map(region => (
          <section key={region} id={region.toLowerCase()}>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              {region}
              <Badge variant="secondary">{grouped[region].length}</Badge>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Time Zone</th>
                    <th className="text-left py-2 px-3">Abbreviation</th>
                    <th className="text-left py-2 px-3">Offset</th>
                    <th className="text-right py-2 px-3">Cities</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[region].map((tz: any) => (
                    <tr key={tz.id} className="border-b hover:bg-accent/50">
                      <td className="py-2 px-3 font-mono text-xs">{tz.ianaName}</td>
                      <td className="py-2 px-3">{tz.abbreviation}</td>
                      <td className="py-2 px-3">{formatOffset(tz.utcOffsetMinutes)}</td>
                      <td className="py-2 px-3 text-right">{tz._count.cities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
