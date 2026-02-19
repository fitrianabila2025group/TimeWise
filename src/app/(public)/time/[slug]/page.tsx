import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { getSiteUrl } from '@/lib/settings';
import { ConverterWidget } from '@/components/converter-widget';
import {
  generateExampleConversions,
  getOffsetDiffHours,
  observesDST,
  isInDST,
  getOverlapWindow,
  getUtcOffsetString,
  getNowInZone,
  formatInZone,
  getZoneAbbr,
  getOffsetMinutes,
} from '@/lib/timezone';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Info, ArrowRight, Link2, Globe, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

// ─── Slug Parsing ─────────────────────────────────────

function parsePairSlug(slug: string): { fromSlug: string; toSlug: string } | null {
  const idx = slug.indexOf('-to-');
  if (idx < 1) return null;
  return {
    fromSlug: slug.substring(0, idx),
    toSlug: slug.substring(idx + 4),
  };
}

function parseCitySlug(slug: string): string | null {
  if (slug.endsWith('-time-now')) {
    return slug.replace(/-time-now$/, '');
  }
  return null;
}

// ─── City Data Fetching ─────────────────────────────────

async function getCityData(citySlug: string) {
  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    include: { timezone: true },
  });
  if (!city) return null;

  // Get global FAQs
  const faqs = await prisma.fAQ.findMany({
    where: { scope: 'global', published: true },
    orderBy: { sortOrder: 'asc' },
    take: 10,
  });

  // Get popular pairs involving this city
  const relatedPairs = await prisma.popularPair.findMany({
    where: {
      OR: [{ fromCityId: city.id }, { toCityId: city.id }],
    },
    include: { fromCity: true, toCity: true },
    take: 10,
  });

  // Get other cities in the same country
  const nearbyCities = await prisma.city.findMany({
    where: {
      countryName: city.countryName,
      isActive: true,
      NOT: { id: city.id },
    },
    include: { timezone: true },
    take: 8,
    orderBy: { population: 'desc' },
  });

  return { city, faqs, relatedPairs, nearbyCities };
}

async function getPairData(slug: string) {
  const parsed = parsePairSlug(slug);
  if (!parsed) return null;

  const [fromCity, toCity] = await Promise.all([
    prisma.city.findUnique({
      where: { slug: parsed.fromSlug },
      include: { timezone: true },
    }),
    prisma.city.findUnique({
      where: { slug: parsed.toSlug },
      include: { timezone: true },
    }),
  ]);

  if (!fromCity || !toCity) return null;

  // Get pair-specific FAQs
  const faqs = await prisma.fAQ.findMany({
    where: {
      OR: [
        { scope: 'pair', fromCityId: fromCity.id, toCityId: toCity.id },
        { scope: 'global' },
      ],
      published: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Get SEO template
  const template = await prisma.seoTemplate.findFirst({
    where: { scope: 'pair' },
  });

  // Get related pairs for internal links
  const relatedPairs = await prisma.popularPair.findMany({
    where: {
      OR: [
        { fromCityId: fromCity.id },
        { toCityId: fromCity.id },
        { fromCityId: toCity.id },
        { toCityId: toCity.id },
      ],
      NOT: {
        AND: [{ fromCityId: fromCity.id }, { toCityId: toCity.id }],
      },
    },
    include: {
      fromCity: true,
      toCity: true,
    },
    take: 10,
  });

  return { fromCity, toCity, faqs, template, relatedPairs };
}

function applyTemplate(tpl: string, vars: Record<string, string>): string {
  let result = tpl;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const siteUrl = await getSiteUrl();

  // Try pair first
  const pairData = await getPairData(params.slug);
  if (pairData) {
    const { fromCity, toCity, template } = pairData;
    const vars = {
      fromCity: fromCity.name,
      toCity: toCity.name,
      fromCountry: fromCity.countryName,
      toCountry: toCity.countryName,
      fromZone: fromCity.timezone.ianaName,
      toZone: toCity.timezone.ianaName,
    };

    const title = template
      ? applyTemplate(template.titleTpl, vars)
      : `${fromCity.name} to ${toCity.name} Time Converter | MeetZone`;
    const description = template
      ? applyTemplate(template.metaTpl, vars)
      : `Convert time between ${fromCity.name} and ${toCity.name}. DST-aware time zone converter.`;

    return {
      title,
      description,
      alternates: { canonical: `${siteUrl}/time/${params.slug}` },
      openGraph: { title, description, url: `${siteUrl}/time/${params.slug}`, type: 'website' },
    };
  }

  // Try city
  const citySlug = parseCitySlug(params.slug);
  if (citySlug) {
    const cityData = await getCityData(citySlug);
    if (cityData) {
      const { city } = cityData;
      const title = `Current Time in ${city.name}, ${city.countryName} | MeetZone`;
      const description = `What time is it in ${city.name}? Current local time, timezone (${city.timezone.abbreviation}, ${getUtcOffsetString(new Date(), city.timezone.ianaName)}), DST info, and time converter.`;

      return {
        title,
        description,
        alternates: { canonical: `${siteUrl}/time/${params.slug}` },
        openGraph: { title, description, url: `${siteUrl}/time/${params.slug}`, type: 'website' },
      };
    }
  }

  return {};
}

export default async function TimeSlugPage({ params }: Props) {
  // Try pair first
  const pairData = await getPairData(params.slug);
  if (pairData) {
    return <PairPageContent data={pairData} slug={params.slug} />;
  }

  // Try city
  const citySlug = parseCitySlug(params.slug);
  if (citySlug) {
    const cityData = await getCityData(citySlug);
    if (cityData) {
      return <CityPageContent data={cityData} slug={params.slug} />;
    }
  }

  notFound();
}

// ─── City Page Component ─────────────────────────────────

async function CityPageContent({ data, slug }: { data: NonNullable<Awaited<ReturnType<typeof getCityData>>>; slug: string }) {
  const { city, faqs, relatedPairs, nearbyCities } = data;
  const now = new Date();
  const siteUrl = await getSiteUrl();
  const zone = city.timezone.ianaName;

  const currentTime = formatInZone(now, zone, 'h:mm a');
  const currentTime24 = formatInZone(now, zone, 'HH:mm');
  const currentDate = formatInZone(now, zone, 'EEEE, MMMM d, yyyy');
  const utcOffset = getUtcOffsetString(now, zone);
  const abbr = getZoneAbbr(now, zone);
  const hasDST = observesDST(zone);
  const inDST = isInDST(now, zone);

  const jsonLd: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Current Time in ${city.name}`,
      description: `Current local time in ${city.name}, ${city.countryName}`,
      url: `${siteUrl}/time/${slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Cities', item: `${siteUrl}/cities` },
        { '@type': 'ListItem', position: 3, name: city.name, item: `${siteUrl}/time/${slug}` },
      ],
    },
  ];

  if (faqs.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  return (
    <>
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

      <div className="container px-4 md:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/cities" className="hover:text-foreground">Cities</Link>
          <span>/</span>
          <span className="text-foreground">{city.name}</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-bold mb-2">
          Current Time in {city.name}, {city.countryName}
        </h1>
        <p className="text-muted-foreground mb-6">
          Local time, timezone information, and DST status for {city.name}.
        </p>

        {/* Current Time Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Current Local Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-bold tracking-tight mb-1">{currentTime}</p>
              <p className="text-xl text-muted-foreground mb-3">{currentTime24}</p>
              <p className="text-sm text-muted-foreground">{currentDate}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Timezone Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone</span>
                <span className="font-medium">{abbr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UTC Offset</span>
                <span className="font-medium">{utcOffset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IANA Zone</span>
                <span className="font-medium text-xs">{zone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">DST</span>
                <div className="flex gap-1">
                  <Badge variant={hasDST ? 'default' : 'secondary'}>
                    {hasDST ? 'Observes DST' : 'No DST'}
                  </Badge>
                  {hasDST && (
                    <Badge variant={inDST ? 'default' : 'outline'}>
                      {inDST ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* City Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              City Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Country</p>
                <p className="font-medium">{city.countryName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Country Code</p>
                <p className="font-medium">{city.countryCode}</p>
              </div>
              {city.lat && city.lng && (
                <>
                  <div>
                    <p className="text-muted-foreground">Latitude</p>
                    <p className="font-medium">{city.lat.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Longitude</p>
                    <p className="font-medium">{city.lng.toFixed(4)}</p>
                  </div>
                </>
              )}
              {city.population && (
                <div>
                  <p className="text-muted-foreground">Population</p>
                  <p className="font-medium">{city.population.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Related Pairs / Convert Time */}
        {relatedPairs.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Convert {city.name} Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relatedPairs.map((pair: any) => (
                  <Link
                    key={pair.id}
                    href={`/time/${pair.fromCity.slug}-to-${pair.toCity.slug}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors text-sm"
                  >
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {pair.fromCity.name} to {pair.toCity.name}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nearby Cities / Same Country */}
        {nearbyCities.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Other Cities in {city.countryName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {nearbyCities.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/time/${c.slug}-time-now`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors text-sm"
                  >
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {getUtcOffsetString(new Date(), c.timezone.ianaName)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq: any, i: number) => (
                  <AccordionItem key={faq.id || i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="text-center py-4">
          <Link
            href="/time"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Convert {city.name} time to another city
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Pair Page Component ─────────────────────────────────

async function PairPageContent({ data, slug }: { data: NonNullable<Awaited<ReturnType<typeof getPairData>>>; slug: string }) {
  const { fromCity, toCity, faqs, template, relatedPairs } = data;
  const now = new Date();
  const siteUrl = await getSiteUrl();

  const fromZone = fromCity.timezone.ianaName;
  const toZone = toCity.timezone.ianaName;

  const offsetDiff = getOffsetDiffHours(now, fromZone, toZone);
  const fromOffset = getUtcOffsetString(now, fromZone);
  const toOffset = getUtcOffsetString(now, toZone);
  const fromDST = observesDST(fromZone);
  const toDST = observesDST(toZone);
  const fromInDST = isInDST(now, fromZone);
  const toInDST = isInDST(now, toZone);
  const examples = generateExampleConversions(now, fromZone, toZone);
  const overlapHours = getOverlapWindow(now, [fromZone, toZone]);

  const vars = {
    fromCity: fromCity.name,
    toCity: toCity.name,
    fromCountry: fromCity.countryName,
    toCountry: toCity.countryName,
    fromZone,
    toZone,
  };

  const intro = template
    ? applyTemplate(template.introTpl, vars)
    : `Convert time between ${fromCity.name} and ${toCity.name} easily.`;

  // Process FAQ templates
  let processedFaqs = faqs;
  if (template?.faqTplJson) {
    try {
      const tplFaqs = JSON.parse(template.faqTplJson) as Array<{ q: string; a: string }>;
      const templateFaqs = tplFaqs.map((f: any, i: number) => ({
        id: `tpl-${i}`,
        scope: 'pair' as const,
        question: applyTemplate(f.q, vars),
        answer: applyTemplate(f.a, vars),
        sortOrder: 100 + i,
        published: true,
        pairSlug: null as string | null,
        fromCityId: null as string | null,
        toCityId: null as string | null,
      }));
      // Merge: DB FAQs first, then template FAQs (avoiding duplicates)
      const dbQuestions = new Set(faqs.map((f: any) => f.question.toLowerCase()));
      const uniqueTemplateFaqs = templateFaqs.filter(
        (f: any) => !dbQuestions.has(f.question.toLowerCase())
      );
      processedFaqs = [...faqs, ...uniqueTemplateFaqs];
    } catch {}
  }

  // JSON-LD
  const jsonLd: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${fromCity.name} to ${toCity.name} Time Converter`,
      description: intro,
      url: `${siteUrl}/time/${slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Time Converter', item: `${siteUrl}/time` },
        {
          '@type': 'ListItem',
          position: 3,
          name: `${fromCity.name} to ${toCity.name}`,
          item: `${siteUrl}/time/${slug}`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'MeetZone Time Zone Converter',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Web',
      url: `${siteUrl}/time/${slug}`,
    },
  ];

  if (processedFaqs.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: processedFaqs.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  return (
    <>
      {jsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}

      <div className="container px-4 md:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/time" className="hover:text-foreground">Time Converter</Link>
          <span>/</span>
          <span className="text-foreground">{fromCity.name} to {toCity.name}</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-bold mb-4">
          {fromCity.name} Time to {toCity.name} Time Converter
        </h1>
        <p className="text-muted-foreground mb-6">{intro}</p>

        {/* Converter Widget */}
        <div className="mb-8">
          <ConverterWidget
            fromCity={{ name: fromCity.name, slug: fromCity.slug, timezone: fromCity.timezone }}
            toCity={{ name: toCity.name, slug: toCity.slug, timezone: toCity.timezone }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Time Difference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Difference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {offsetDiff > 0 ? '+' : ''}{offsetDiff} hours
              </p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>{fromCity.name}: {fromOffset}</p>
                <p>{toCity.name}: {toOffset}</p>
              </div>
              <p className="mt-3 text-sm">
                When it&apos;s noon in {fromCity.name}, it&apos;s{' '}
                <strong>{offsetDiff > 0 ? `${12 + offsetDiff}:00` : `${12 + offsetDiff}:00`}</strong>{' '}
                in {toCity.name}.
              </p>
            </CardContent>
          </Card>

          {/* DST Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                DST Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{fromCity.name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={fromDST ? 'default' : 'secondary'}>
                    {fromDST ? 'Observes DST' : 'No DST'}
                  </Badge>
                  {fromDST && (
                    <Badge variant={fromInDST ? 'default' : 'outline'}>
                      {fromInDST ? 'Currently in DST' : 'Standard Time'}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="font-medium">{toCity.name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={toDST ? 'default' : 'secondary'}>
                    {toDST ? 'Observes DST' : 'No DST'}
                  </Badge>
                  {toDST && (
                    <Badge variant={toInDST ? 'default' : 'outline'}>
                      {toInDST ? 'Currently in DST' : 'Standard Time'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Meeting Times */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Best Meeting Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overlapHours.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    Work hours overlap (9 AM–5 PM both cities):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {overlapHours.map((h) => (
                      <Badge key={h} variant="outline">
                        {h.toString().padStart(2, '0')}:00 UTC
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No standard work hours overlap. Consider early morning or late evening meetings.
                </p>
              )}
              <Link href="/meeting-planner" className="text-sm text-primary hover:underline mt-3 block">
                Open Meeting Planner →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Example Conversions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Example Time Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Time of Day</th>
                    <th className="text-left py-2 pr-4">{fromCity.name}</th>
                    <th className="text-left py-2">{toCity.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {examples.map((ex) => (
                    <tr key={ex.label} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{ex.label}</td>
                      <td className="py-2 pr-4 font-medium">{ex.fromTime}</td>
                      <td className="py-2 font-medium">{ex.toTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        {processedFaqs.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {processedFaqs.map((faq: any, i: number) => (
                  <AccordionItem key={faq.id || i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Related Links */}
        {relatedPairs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Related Time Conversions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relatedPairs.map((pair: any) => (
                  <Link
                    key={pair.id}
                    href={`/time/${pair.fromCity.slug}-to-${pair.toCity.slug}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors text-sm"
                  >
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {pair.fromCity.name} to {pair.toCity.name}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
