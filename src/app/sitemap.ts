import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let baseUrl = 'https://meetzone.es';
  try {
    const siteUrlSetting = await prisma.siteSetting.findUnique({ where: { key: 'siteUrl' } });
    baseUrl = siteUrlSetting?.value || baseUrl;
  } catch {}

  // Count pairs for pagination
  const pairCount = await prisma.popularPair.count();
  const pairPages = Math.ceil(pairCount / 50000);

  // Static sitemaps
  const sitemaps: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/time`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/meeting-planner`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/world-clock`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/cities`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/timezones`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ];

  // Blog posts
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });
  for (const post of posts) {
    sitemaps.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  // Popular pairs (all of them for SEO)
  const pairs = await prisma.popularPair.findMany({
    select: { slug: true },
    orderBy: { priority: 'desc' },
  });
  for (const pair of pairs) {
    sitemaps.push({
      url: `${baseUrl}/time/${pair.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  // City pages
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });
  for (const city of cities) {
    sitemaps.push({
      url: `${baseUrl}/time/${city.slug}-time-now`,
      lastModified: city.updatedAt,
      changeFrequency: 'daily',
      priority: 0.6,
    });
  }

  return sitemaps;
}
