import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { CourseThumb } from "@/components/site/course-thumb";
import { SafeHtml } from "@/components/site/safe-html";
import { Stars } from "@/components/site/rating";
import { AlertTriangleIcon, CheckCircleIcon, CheckIcon, ChevronRightIcon, ClockIcon, LayersIcon, UsersIcon } from "@/components/icons";
import { AwardIcon } from "@/components/icons/icons-learn";
import { Curriculum, CourseReviews, EnrollCta } from "@/features/site/course-parts";
import { formatDate, formatPrice, humanDuration, isFree, levelLabel, toStringList } from "@/features/site/format";
import { siteMessages as t } from "@/features/site/messages";
import type { CourseDetail } from "@/features/site/types";
import { getCurrentUser, serverApi } from "@/lib/server-api";

const load = cache((slug: string) => serverApi<CourseDetail>(`/courses/${encodeURIComponent(slug)}`));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug);
  if (!r.ok || !r.data) return { title: t.course.notFoundTitle };
  const text = (r.data.description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || t.course.metaFallback;
  return { title: r.data.title, description: text, openGraph: { title: r.data.title, description: text, type: "website" } };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [res, user] = await Promise.all([load(slug), getCurrentUser()]);
  if (res.status === 404 || res.status === 422) notFound();
  if (!res.ok || !res.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<AlertTriangleIcon />}
          title={t.course.unavailableTitle}
          description={t.course.unavailableText}
          action={<Link href={`/courses/${slug}`} className={buttonStyles()}>{t.states.retry}</Link>}
        />
      </div>
    );
  }
  const c = res.data;
  const outcomes = toStringList(c.learning_outcomes);
  const benefits = toStringList(c.benefits);
  const requirements = toStringList(c.requirements);
  const sections = (c.sections ?? []).filter((s) => s.lessons.length > 0);
  const orphan = (c.lessons ?? []).filter((l) => l.section_id === null);
  const curriculum = orphan.length
    ? [...sections, { id: -1, course_id: c.id, title: t.course.unnamedSection, description: null, position: 9999, lessons: orphan }]
    : sections;
  const totalDuration = (c.lessons ?? []).reduce((a, l) => a + l.duration, 0);
  const free = isFree(c.price);
  const level = levelLabel(c.level);

  return (
    <article>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted">
            <Link href="/" className="hover:text-foreground">{t.course.home}</Link>
            <ChevronRightIcon size={14} />
            <Link href="/courses" className="hover:text-foreground">{t.course.courses}</Link>
            {c.category && (
              <>
                <ChevronRightIcon size={14} />
                <Link href={`/courses?category=${c.category.slug}`} className="hover:text-foreground">{c.category.name}</Link>
              </>
            )}
          </nav>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {c.is_featured && <Badge tone="primary">{t.card.featured}</Badge>}
              {level && <Badge>{level}</Badge>}
              {c.status !== "published" && <Badge tone="warning">{t.course.draft}</Badge>}
            </div>
            <h1 className="mt-3 text-3xl leading-tight font-extrabold">{c.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {c.reviews_count > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-bold">{c.avg_rating.toFixed(1)}</span>
                  <Stars value={c.avg_rating} />
                  <span className="text-muted">{t.course.ratingCount(c.reviews_count)}</span>
                </span>
              ) : (
                <span className="text-muted">{t.card.noRating}</span>
              )}
              <span className="inline-flex items-center gap-1.5 text-muted"><UsersIcon size={15} />{t.course.learners(c.enrollments_count)}</span>
              <span className="inline-flex items-center gap-1.5 text-muted"><LayersIcon size={15} />{t.course.lessons(c.lessons_count)}</span>
              {totalDuration > 0 && <span className="inline-flex items-center gap-1.5 text-muted"><ClockIcon size={15} />{humanDuration(totalDuration)}</span>}
            </div>
            {c.instructor && (
              <p className="mt-4 flex items-center gap-2 text-sm">
                <Avatar name={c.instructor.name} src={c.instructor.avatar} size="sm" />
                <span className="text-muted">{t.course.instructor}</span>
                <span className="font-semibold">{c.instructor.name}</span>
              </p>
            )}
            <p className="mt-2 text-xs text-muted">{t.course.updated} {formatDate(c.updated_at)}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10 lg:order-1">
          {outcomes.length > 0 && (
            <section aria-labelledby="outcomes-h" className="rounded-xl border border-border bg-surface p-5">
              <h2 id="outcomes-h" className="text-xl font-bold">{t.course.outcomes}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {outcomes.map((o, i) => (
                  <li key={i} className="flex gap-2"><CheckIcon size={16} className="mt-1 text-success" /><span>{o}</span></li>
                ))}
              </ul>
            </section>
          )}

          {c.description && (
            <section aria-labelledby="about-h">
              <h2 id="about-h" className="mb-3 text-xl font-bold">{t.course.about}</h2>
              <SafeHtml html={c.description} />
            </section>
          )}

          {requirements.length > 0 && (
            <section aria-labelledby="req-h">
              <h2 id="req-h" className="mb-3 text-xl font-bold">{t.course.requirements}</h2>
              <ul className="list-disc space-y-1 pl-5">{requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          )}

          {benefits.length > 0 && (
            <section aria-labelledby="ben-h">
              <h2 id="ben-h" className="mb-3 text-xl font-bold">{t.course.benefits}</h2>
              <ul className="list-disc space-y-1 pl-5">{benefits.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          )}

          <section aria-labelledby="curr-h">
            <h2 id="curr-h" className="text-xl font-bold">{t.course.curriculum}</h2>
            <p className="mt-1 mb-3 text-sm text-muted">{t.course.curriculumSummary(curriculum.length, c.lessons_count, humanDuration(totalDuration))}</p>
            {curriculum.length ? (
              <Curriculum sections={curriculum} slug={c.slug} enrolled={c.is_enrolled} />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted">{t.course.noLessons}</p>
            )}
          </section>

          <section aria-labelledby="rev-h">
            <h2 id="rev-h" className="mb-4 text-xl font-bold">{t.course.reviews}</h2>
            <CourseReviews courseId={c.id} userId={user?.id ?? null} isEnrolled={c.is_enrolled} />
          </section>
        </div>

        <aside className="order-first lg:order-2">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-20">
            <CourseThumb id={c.id} title={c.title} src={c.thumbnail} priority className="rounded-lg" />
            <p className={`text-3xl font-extrabold ${free ? "text-success" : ""}`}>{formatPrice(c.price)}</p>
            <EnrollCta courseId={c.id} slug={c.slug} free={free} enrolled={c.is_enrolled} loggedIn={!!user} />
            {c.trailer_url && /^https?:\/\//i.test(c.trailer_url) && (
              <a href={c.trailer_url} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "outline", className: "w-full" })}>{t.course.trailer}</a>
            )}
            <div>
              <p className="mb-2 text-sm font-semibold">{t.course.includes}</p>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2"><LayersIcon size={15} />{t.course.lessons(c.lessons_count)}</li>
                {totalDuration > 0 && <li className="flex items-center gap-2"><ClockIcon size={15} />{humanDuration(totalDuration)}</li>}
                <li className="flex items-center gap-2"><CheckCircleIcon size={15} />{t.course.lifetime}</li>
                {c.certificate_template_id && <li className="flex items-center gap-2"><AwardIcon size={15} />{t.course.certificate}</li>}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
