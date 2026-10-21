import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/features/site/catalog-view";
import { readFilters, toQueryString } from "@/features/site/catalog-filters";
import { getCategories, getCourses } from "@/features/site/public-api";
import { siteMessages as t } from "@/features/site/messages";

export const metadata: Metadata = {
  title: t.catalog.title,
  description: t.catalog.metaDescription,
  openGraph: { title: t.catalog.title, description: t.catalog.metaDescription, type: "website" },
};

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) sp.set(k, val);
  }
  const f = readFilters(sp);
  const apiQs = new URLSearchParams();
  if (f.q) apiQs.set("search", f.q);
  if (f.category) apiQs.set("category", f.category);
  if (f.level) apiQs.set("level", f.level);
  if (f.pricing) apiQs.set("pricing", f.pricing);
  apiQs.set("sort", f.sort);
  apiQs.set("page", String(f.page));
  apiQs.set("per_page", "12");
  const [categories, initial] = await Promise.all([getCategories(), getCourses(apiQs.toString(), 30)]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t.catalog.title}</h1>
        <p className="mt-1 text-muted">{t.catalog.subtitle}</p>
      </header>
      <Suspense>
        <CatalogView categories={categories ?? []} initial={initial} initialKey={toQueryString(f)} />
      </Suspense>
    </div>
  );
}
