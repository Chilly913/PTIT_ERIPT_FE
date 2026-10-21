import type { Metadata } from "next";
import Link from "next/link";
import { NewsCard } from "@/components/site/news-card";
import { buttonStyles } from "@/components/ui/button";
import { getNews } from "@/features/site/public-api";
import { siteMessages as t } from "@/features/site/messages";

export const metadata: Metadata = {
  title: t.news.title,
  description: t.news.metaDescription,
  openGraph: { title: t.news.title, description: t.news.metaDescription, type: "website" },
};

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const pageParam = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const page = Math.max(1, Number(pageParam) || 1);
  const res = await getNews(`page=${page}&per_page=9`);
  const posts = res?.data ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.news.title}</h1>
      <p className="mt-2 text-muted">{t.news.subtitle}</p>

      {!res && <p role="status" className="mt-8 rounded-xl border border-border bg-surface p-6 text-center text-muted">{t.news.unavailable}</p>}
      {res && posts.length === 0 && <p role="status" className="mt-8 rounded-xl border border-border bg-surface p-6 text-center text-muted">{t.news.empty}</p>}

      {posts.length > 0 && (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => <li key={p.id}><NewsCard post={p} priority={i < 3} className="h-full" /></li>)}
        </ul>
      )}

      {res && res.last_page > 1 && (
        <nav aria-label={t.news.pagination} className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && <Link href={`/news?page=${page - 1}`} className={buttonStyles({ variant: "outline" })}>{t.news.prev}</Link>}
          <span className="text-sm text-muted">{page} / {res.last_page}</span>
          {page < res.last_page && <Link href={`/news?page=${page + 1}`} className={buttonStyles({ variant: "outline" })}>{t.news.next}</Link>}
        </nav>
      )}
    </div>
  );
}
