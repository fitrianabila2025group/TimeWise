import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Blog – Time Zone Tips & Guides | MeetZone',
  description: 'Learn about time zones, daylight saving time, international scheduling, and productivity tips for remote teams.',
  alternates: { canonical: '/blog' },
};

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      tags: true,
      publishedAt: true,
      readingTimeMinutes: true,
    },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Blog</h1>
        <p className="text-muted-foreground mb-8">
          Tips, guides, and insights about time zones, scheduling, and remote work.
        </p>

        <div className="space-y-4">
          {posts.map((post: any) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-primary">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-muted-foreground text-sm mb-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt.toISOString()}>
                        {post.publishedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                    )}
                    {post.readingTimeMinutes && (
                      <span>{post.readingTimeMinutes} min read</span>
                    )}
                  </div>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {post.tags.map((tag: any) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}

          {posts.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No blog posts yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
