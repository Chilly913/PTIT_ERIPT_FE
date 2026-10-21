import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { CourseCard } from "@/components/site/course-card";
import { CountUp } from "@/components/site/count-up";
import { HeroSlider, type Slide } from "@/components/site/hero-slider";
import { ArrowRightIcon, BarChartIcon, BookIcon, ChevronRightIcon, LayersIcon, SchoolIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { AwardIcon } from "@/components/icons/icons-learn";
import { formatDate } from "@/features/site/format";
import { getCategories, getCourses, getNews, getPartners, getSiteStats } from "@/features/site/public-api";
import { siteMessages as t } from "@/features/site/messages";
import { getCurrentUser } from "@/lib/server-api";
import { homeFor } from "@/lib/auth-utils";

const title = "Viện Kinh tế Bưu điện – ERIPT";
const description = t.landing.subtitle;
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, type: "website" },
};

const pillarIcons = [SchoolIcon, BarChartIcon, LayersIcon];
const whyIcons = [BookIcon, BarChartIcon, AwardIcon];

function SectionHead({ id, title, hint, href }: { id: string; title: string; hint?: string; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-2xl font-bold tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-muted">{hint}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
          {t.landing.seeAll}<ChevronRightIcon size={16} />
        </Link>
      )}
    </div>
  );
}

export default async function LandingPage() {
  const [user, news, partners, featured, latest, categories, stats] = await Promise.all([
    getCurrentUser(),
    getNews("per_page=5"),
    getPartners(),
    getCourses("featured=1&per_page=4&sort=popular"),
    getCourses("per_page=4&sort=latest"),
    getCategories(),
    getSiteStats(),
  ]);
  const newsList = news?.data ?? [];
  const partnerList = partners ?? [];
  const courseList = (featured?.data?.length ? featured.data : latest?.data) ?? [];
  const categoryList = (categories ?? []).filter((c) => c.courses_count > 0).slice(0, 8);
  const [lead, ...rest] = newsList;

  // Slide 1 introduces the Institute; the next ones are the newest posts that have a cover photo.
  const slides: Slide[] = [
    { id: "intro", image: "/images/auth-campus.png", eyebrow: t.landing.introSlide.eyebrow, title: t.landing.title, text: t.landing.subtitle, href: "/courses", cta: t.landing.introSlide.cta },
    ...newsList.filter((p) => p.cover_image).slice(0, 4).map((p) => ({ id: `news-${p.id}`, image: p.cover_image as string, eyebrow: `${t.landing.newsSlide.eyebrow} · ${formatDate(p.published_at)}`, title: p.title, text: p.excerpt ?? undefined, href: `/news/${p.slug}`, cta: t.landing.newsSlide.cta })),
  ];

  const figures = stats
    ? [
        { label: t.landing.figures.courses, value: stats.courses, Icon: BookIcon },
        { label: t.landing.figures.instructors, value: stats.instructors, Icon: UsersIcon },
        { label: t.landing.figures.lessons, value: stats.lessons, Icon: LayersIcon },
        { label: t.landing.figures.learners, value: stats.learners, Icon: SchoolIcon },
      ]
    : [];

  return (
    <>
      <HeroSlider slides={slides} label={t.landing.sliderLabel} />

      {/* Course search sits over the bottom edge of the slider */}
      <div className="relative z-10 mx-auto -mt-8 w-full max-w-3xl px-4 sm:px-6">
        <form action="/courses" method="get" role="search" className="flex items-center gap-2 rounded-xl border border-border bg-surface p-1.5 shadow-(--menu-shadow)">
          <SearchIcon size={18} className="ml-3 shrink-0 text-muted" />
          <input type="search" name="q" aria-label={t.nav.searchLabel} placeholder={t.landing.searchPlaceholder} className="h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted" />
          <button type="submit" className={buttonStyles({ size: "lg" })}>{t.landing.searchButton}</button>
        </form>
        <p className="mt-3 text-center text-sm text-muted">
          {user ? (
            <Link href={homeFor(user)} className="font-medium text-primary hover:underline">{t.landing.continueLearning}</Link>
          ) : (
            <>
              <Link href="/courses" className="font-medium text-primary hover:underline">{t.landing.browse}</Link>
              <span aria-hidden> · </span>
              <Link href="/register" className="font-medium text-primary hover:underline">{t.landing.startFree}</Link>
            </>
          )}
        </p>
      </div>

      {/* Headline figures */}
      {figures.length > 0 && (
        <section className="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6" aria-label={t.landing.statsTitle}>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {figures.map(({ label, value, Icon }) => (
              <li key={label} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Icon size={24} /></span>
                <div>
                  <p className="text-3xl leading-none font-extrabold tabular-nums"><CountUp value={value} /></p>
                  <p className="mt-1 text-sm text-muted">{label}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What the Institute does */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="pillars-h">
        <h2 id="pillars-h" className="text-center text-2xl font-bold tracking-tight">{t.landing.pillarsTitle}</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {t.landing.pillars.map((p, i) => {
            const Icon = pillarIcons[i];
            return (
              <li key={p.title} className="rounded-xl border border-border bg-surface p-6 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Icon size={24} /></span>
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-muted">{p.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Categories */}
      {categoryList.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="cats-h">
          <SectionHead id="cats-h" title={t.landing.categories} hint={t.landing.categoriesHint} href="/courses" />
          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {categoryList.map((c) => (
              <li key={c.id}>
                <Link href={`/courses?category=${c.slug}`} className="group flex h-full items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold group-hover:text-primary">{c.name}</span>
                    <span className="block text-sm text-muted">{t.landing.coursesCount(c.courses_count)}</span>
                  </span>
                  <ChevronRightIcon size={18} className="shrink-0 text-muted group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* News: one lead story and a list of the next ones */}
      {lead && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="news-h">
          <SectionHead id="news-h" title={t.landing.newsTitle} hint={t.landing.newsHint} href="/news" />
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <article className="group relative overflow-hidden rounded-xl border border-border bg-surface transition-colors focus-within:border-primary hover:border-border-strong">
              <div className="relative aspect-video w-full bg-surface-muted">
                {lead.cover_image && <Image src={lead.cover_image} alt="" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />}
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">{t.landing.newsLead} · <time dateTime={lead.published_at}>{formatDate(lead.published_at)}</time></p>
                <h3 className="mt-2 line-clamp-3 text-xl font-bold leading-snug">
                  <Link href={`/news/${lead.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{lead.title}</Link>
                </h3>
                {lead.excerpt && <p className="mt-2 line-clamp-3 text-muted">{lead.excerpt}</p>}
              </div>
            </article>
            <ul className="flex flex-col gap-3">
              {rest.slice(0, 4).map((p) => (
                <li key={p.id} className="group relative flex gap-4 rounded-xl border border-border bg-surface p-3 transition-colors focus-within:border-primary hover:border-border-strong">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                    {p.cover_image && <Image src={p.cover_image} alt="" fill sizes="112px" className="object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <time dateTime={p.published_at} className="text-xs font-medium text-muted">{formatDate(p.published_at)}</time>
                    <h3 className="line-clamp-3 text-sm font-semibold leading-snug">
                      <Link href={`/news/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{p.title}</Link>
                    </h3>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Courses */}
      {courseList.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="featured-h">
          <SectionHead id="featured-h" title={featured?.data?.length ? t.landing.featured : t.landing.latest} hint={t.landing.featuredHint} href="/courses" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courseList.map((c, i) => <CourseCard key={c.id} course={c} priority={i < 2} />)}
          </div>
        </section>
      )}

      {/* How it works + why ERIPT */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6" aria-labelledby="how-h">
        <h2 id="how-h" className="text-center text-2xl font-bold tracking-tight">{t.landing.howTitle}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {t.landing.how.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-border bg-surface p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <h2 className="mt-12 text-center text-2xl font-bold tracking-tight">{t.landing.whyTitle}</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {t.landing.why.map((w, i) => {
            const Icon = whyIcons[i];
            return (
              <li key={w.title} className="flex gap-4 rounded-xl border border-border bg-surface p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"><Icon size={22} /></span>
                <div>
                  <h3 className="font-semibold">{w.title}</h3>
                  <p className="mt-1 text-sm text-muted">{w.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Partners: slow auto-scrolling logo strip (paused on hover, static with reduced motion) */}
      {partnerList.length > 0 && (
        <section className="mt-14 border-y border-border bg-surface" aria-labelledby="partners-h">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
            <h2 id="partners-h" className="text-center text-2xl font-bold tracking-tight">{t.landing.partnersTitle}</h2>
            <p className="mx-auto mt-1 max-w-2xl text-center text-muted">{t.landing.partnersHint}</p>
          </div>
          <div className="group relative overflow-hidden pb-12" aria-label={t.landing.partnersTitle}>
            <ul className="flex w-max animate-[marquee_45s_linear_infinite] gap-4 pr-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
              {[...partnerList, ...partnerList].map((p, i) => {
                const dup = i >= partnerList.length;
                const logo = (
                  <span className="flex h-24 w-44 items-center justify-center rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                    <Image src={p.logo} alt={dup ? "" : p.name} width={160} height={72} unoptimized={p.logo.endsWith(".svg")} className="h-14 w-auto max-w-full object-contain" />
                  </span>
                );
                return (
                  <li key={`${p.id}-${i}`} aria-hidden={dup || undefined}>
                    {p.website_url ? <a href={p.website_url} target="_blank" rel="noopener noreferrer" aria-label={p.name} tabIndex={dup ? -1 : undefined} className="block">{logo}</a> : logo}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-4 pt-14 sm:px-6" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-center text-2xl font-bold tracking-tight">{t.landing.faqTitle}</h2>
        <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface">
          {t.landing.faq.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronRightIcon size={18} className="shrink-0 text-muted transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {!user && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold">{t.landing.ctaTitle}</h2>
            <p className="opacity-90">{t.landing.ctaText}</p>
            <Link href="/register" className={buttonStyles({ size: "lg", variant: "secondary" })}>{t.nav.register}<ArrowRightIcon size={16} /></Link>
          </div>
        </section>
      )}
      <div className="pb-14" />
    </>
  );
}
