import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { marked } from 'marked';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug, isPublished: true },
    select: { title: true, excerpt: true, metaTitle: true, metaDescription: true, slug: true },
  });
  if (!post) return {};
  return {
    title: post.metaTitle || `${post.title} | MeetZone Blog`,
    description: post.metaDescription || post.excerpt || '',
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true },
    });
    return posts.map((p: any) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

/**
 * Render content as HTML. If the content looks like markdown (starts with # or contains ##),
 * convert it using marked. Otherwise, assume it's already HTML.
 */
function renderContent(content: string): string {
  // Detect markdown: starts with heading, or contains markdown patterns
  const isMarkdown = /^#\s|^##\s|^\*\*|^- \*\*/m.test(content.trim());
  if (isMarkdown) {
    return marked.parse(content, { async: false }) as string;
  }
  return content;
}

export default async function BlogPostPage({ params }: Props) {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug, isPublished: true },
  });

  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: 'MeetZone' },
    publisher: { '@type': 'Organization', name: 'MeetZone' },
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/blog" className="hover:text-primary">Blog</Link>
          <span className="mx-2">/</span>
          <span>{post.title}</span>
        </nav>

        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
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
              <div className="flex flex-wrap gap-1">
                {post.tags.map((tag: any) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </header>

          <div
            className="prose prose-neutral dark:prose-invert max-w-none
              prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
              prose-p:leading-relaxed prose-li:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:font-semibold prose-blockquote:border-l-primary"
            dangerouslySetInnerHTML={{ __html: renderContent(post.contentHtml) }}
          />
        </article>

        <div className="mt-12 pt-6 border-t">
          <Link href="/blog" className="text-primary hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
