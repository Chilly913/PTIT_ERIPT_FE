import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeHtml } from "@/components/site/safe-html";
import { NewsCard } from "@/components/site/news-card";
import { ChevronLeftIcon } from "@/components/icons";
import { formatDate } from "@/features/site/format";
import { getNews, getNewsPost } from "@/features/site/public-api";
import { siteMessages as t } from "@/features/site/messages";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getNewsPost((await params).slug);
  if (!post) return { title: t.news.title };
  return { title: post.title, description: post.excerpt ?? undefined, openGraph: { title: post.title, description: post.excerpt ?? undefined, type: "article" } };
}

export default async function NewsPostPage({ params }: Params) {
  const { slug } = await params;
  const [post, more] = await Promise.all([getNewsPost(slug), getNews("per_page=4")]);
  if (!post) notFound();
  const related = (more?.data ?? []).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/news" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ChevronLeftIcon size={16} />{t.news.back}</Link>
      <h1 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance">{post.title}</h1>
      <time dateTime={post.published_at} className="mt-2 block text-sm text-muted">{formatDate(post.published_at)}</time>
      {post.cover_image && (
        <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl bg-surface-muted">
          <Image src={post.cover_image} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      )}
      <SafeHtml html={post.content} className="mt-6" />
      <p className="mt-8 text-sm text-muted">{t.news.source}</p>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-h">
          <h2 id="related-h" className="text-xl font-bold">{t.news.related}</h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-3">
            {related.map((p) => <li key={p.id}><NewsCard post={p} className="h-full" /></li>)}
          </ul>
        </section>
      )}
    </article>
  );
}
