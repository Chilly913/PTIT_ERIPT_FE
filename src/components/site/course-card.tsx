import Link from "next/link";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { BookIcon, UsersIcon } from "@/components/icons";
import { CourseThumb } from "./course-thumb";
import { Stars } from "./rating";
import { formatPrice, isFree, levelLabel } from "@/features/site/format";
import { siteMessages as t } from "@/features/site/messages";
import type { CourseSummary } from "@/features/site/types";

/** Catalog / landing card. A single link covers the whole card (one tab stop, hover prefetch by next/link). */
export function CourseCard({ course, priority = false, className }: { course: CourseSummary; priority?: boolean; className?: string }) {
  const rating = course.reviews_avg_rating;
  const level = levelLabel(course.level);
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors focus-within:border-primary hover:border-border-strong", className)}>
      <CourseThumb id={course.id} title={course.title} src={course.thumbnail} priority={priority} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex min-h-5 flex-wrap items-center gap-1.5">
          {course.is_featured && <Badge tone="primary">{t.card.featured}</Badge>}
          {course.category && <span className="truncate text-xs text-muted">{course.category.name}</span>}
        </div>
        <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-muted">{course.instructor?.name ?? ""}</p>
        <div className="flex items-center gap-2 text-sm">
          {rating ? (
            <>
              <span className="font-semibold">{rating.toFixed(1)}</span>
              <Stars value={rating} size={13} />
              <span className="text-muted">({course.reviews_count})</span>
            </>
          ) : (
            <span className="text-muted">{t.card.noRating}</span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-sm text-muted">
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><BookIcon size={14} />{t.card.lessons(course.lessons_count)}</span>
            {level && <span className="hidden items-center gap-1 sm:inline-flex"><UsersIcon size={14} />{level}</span>}
          </span>
          <span className={cn("text-base font-bold", isFree(course.price) ? "text-success" : "text-foreground")}>{formatPrice(course.price)}</span>
        </div>
      </div>
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface" aria-hidden>
      <div className="aspect-video w-full animate-[flat-pulse_1.4s_ease-in-out_infinite] bg-border" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-5 w-24 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
        <div className="h-11 w-full animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
        <div className="h-4 w-1/2 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
        <div className="h-4 w-2/3 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
        <div className="mt-2 flex items-center justify-between pt-2">
          <div className="h-4 w-20 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
          <div className="h-5 w-16 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
        </div>
      </div>
    </div>
  );
}
