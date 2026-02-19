import Link from 'next/link';
import { CitySearch } from '@/components/city-search';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import prisma from '@/lib/prisma';
import { getSiteUrl } from '@/lib/settings';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  return {
    title: 'Time Zone Converter — Browse All Conversions',
    description: 'Convert time between 300+ cities worldwide. Browse popular conversions or search for any city pair.',
    alternates: { canonical: `${siteUrl}/time` },
  };
}

export default async function TimeHubPage() {
  const pairs = await prisma.popularPair.findMany({
    take: 100,
    orderBy: { priority: 'asc' },
    include: {
      fromCity: true,
      toCity: true,
    },
  });

  return (
    <div className="container px-4 md:px-8 py-8">
      <h1 className="text-3xl font-bold mb-4">Time Zone Converter</h1>
      <p className="text-muted-foreground mb-6">
        Convert time between any two cities. Search below or browse popular conversions.
      </p>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <CitySearch />
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Popular Conversions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pairs.map((pair: any) => (
          <Link
            key={pair.id}
            href={`/time/${pair.fromCity.slug}-to-${pair.toCity.slug}`}
            className="p-3 rounded-lg border hover:bg-accent transition-colors text-sm font-medium"
          >
            {pair.fromCity.name} → {pair.toCity.name}
          </Link>
        ))}
      </div>

      {pairs.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No popular pairs yet. Use the search to convert time.</p>
      )}
    </div>
  );
}
