import Link from 'next/link';
import { Clock, Globe, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CitySearch } from '@/components/city-search';
import prisma from '@/lib/prisma';
import { getSiteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

async function getPopularPairs() {
  try {
    return await prisma.popularPair.findMany({
      take: 20,
      orderBy: { priority: 'asc' },
      include: {
        fromCity: { include: { timezone: true } },
        toCity: { include: { timezone: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const pairs = await getPopularPairs();
  const siteUrl = await getSiteUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MeetZone',
    url: siteUrl,
    description: 'Free time zone converter and meeting planner for global teams.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/time/{search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-20">
        <div className="container px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Time Zone Converter & Meeting Planner
            </h1>
            <p className="text-lg text-muted-foreground">
              Convert time between 300+ cities worldwide. Plan meetings across time zones with DST support.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <CitySearch />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 md:py-16">
        <div className="container px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Time Converter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Convert time between any two cities instantly. Supports DST, 12h/24h formats.
                </p>
                <Link href="/time">
                  <Button variant="link" className="px-0 mt-2">
                    Convert time <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Meeting Planner</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Find the best meeting time for teams across 2–8 cities with overlap scoring.
                </p>
                <Link href="/meeting-planner">
                  <Button variant="link" className="px-0 mt-2">
                    Plan meeting <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Globe className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">World Clock</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View current time in multiple cities. Customizable, always up to date.
                </p>
                <Link href="/world-clock">
                  <Button variant="link" className="px-0 mt-2">
                    View clock <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Pairs */}
      {pairs.length > 0 && (
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container px-4 md:px-8">
            <h2 className="text-2xl font-bold mb-6">Popular Time Conversions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {pairs.map((pair: any) => (
                <Link
                  key={pair.id}
                  href={`/time/${pair.fromCity.slug}-to-${pair.toCity.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent transition-colors text-sm"
                >
                  <span className="font-medium truncate">
                    {pair.fromCity.name} → {pair.toCity.name}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href="/time">
                <Button variant="outline">View all conversions</Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
