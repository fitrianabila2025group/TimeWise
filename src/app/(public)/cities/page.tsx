import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'All Cities – Time Zone Directory | MeetZone',
  description: 'Browse our directory of 300+ cities with their time zones. Find current time and convert between cities worldwide.',
  alternates: { canonical: '/cities' },
};

export const dynamic = 'force-dynamic';

export default async function CitiesPage() {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    include: { timezone: true },
    orderBy: [{ countryName: 'asc' }, { name: 'asc' }],
  });

  // Group by country
  const grouped = cities.reduce<Record<string, typeof cities>>((acc: Record<string, typeof cities>, city: typeof cities[number]) => {
    if (!acc[city.countryName]) acc[city.countryName] = [];
    acc[city.countryName].push(city);
    return acc;
  }, {});

  const countries = Object.keys(grouped).sort();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Cities Directory</h1>
      <p className="text-muted-foreground mb-8">
        Browse {cities.length} cities across {countries.length} countries with their time zones.
      </p>

      {/* Country quick nav */}
      <div className="flex flex-wrap gap-1 mb-8">
        {countries.map(country => (
          <a
            key={country}
            href={`#${country.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 transition-colors"
          >
            {country}
          </a>
        ))}
      </div>

      {/* City listings */}
      <div className="space-y-8">
        {countries.map(country => (
          <section key={country} id={country.toLowerCase().replace(/\s+/g, '-')}>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              {country}
              <Badge variant="secondary">{grouped[country].length}</Badge>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {grouped[country].map((city: any) => (
                <Link
                  key={city.id}
                  href={`/time/${city.slug}-time-now`}
                  className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                >
                  <span className="font-medium">{city.name}</span>
                  <span className="text-muted-foreground text-xs">{city.timezone.ianaName}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
