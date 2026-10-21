import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDate } from "@/features/site/format";
import type { NewsItem } from "@/features/site/types";

/** News teaser card. One link covers the whole card. */
export function NewsCard({ post, priority = false, className }: { post: NewsItem; priority?: boolean; className?: string }) {
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors focus-within:border-primary hover:border-border-strong", className)}>
      <div className="relative aspect-video w-full bg-surface-muted">
        {post.cover_image ? (
          <Image src={post.cover_image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" priority={priority} className="object-cover" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <time dateTime={post.published_at} className="text-xs font-medium text-muted">{formatDate(post.published_at)}</time>
        <h3 className="line-clamp-3 text-base font-semibold leading-snug">
          <Link href={`/news/${post.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{post.title}</Link>
        </h3>
        {post.excerpt && <p className="line-clamp-3 text-sm text-muted">{post.excerpt}</p>}
      </div>
    </article>
  );
}
