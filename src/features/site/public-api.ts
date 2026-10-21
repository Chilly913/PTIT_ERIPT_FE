import "server-only";
import { API_URL } from "@/lib/server-config";
import type { CategoryNode, CourseSummary, LegacyPage, NewsDetail, NewsItem, Partner, SiteSettings } from "./types";

/**
 * Cached, anonymous reads of public endpoints (no cookie, so safe to share between visitors).
 * Returns null on any failure: pages show a calm "chưa sẵn sàng" state instead of crashing.
 */
async function publicGet<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getSiteSettings = () => publicGet<SiteSettings>("/site-settings", 60);
export const getCategories = () => publicGet<CategoryNode[]>("/categories", 120);
export const getCourses = (query: string, revalidate = 60) => publicGet<LegacyPage<CourseSummary>>(`/courses?${query}`, revalidate);

export const getNews = (query = "", revalidate = 60) => publicGet<LegacyPage<NewsItem>>(`/news${query ? `?${query}` : ""}`, revalidate);
export const getNewsPost = (slug: string) => publicGet<NewsDetail>(`/news/${encodeURIComponent(slug)}`, 60);
export interface SiteStats {
  courses: number;
  instructors: number;
  lessons: number;
  learners: number;
}
export const getSiteStats = () => publicGet<SiteStats>("/site-stats", 300);
export const getPartners = () => publicGet<Partner[]>("/partners", 300);

/** Resolves a possibly relative media URL (`/minio/...`) against the public site; absolute URLs pass through. */
export function mediaUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  return u;
}
