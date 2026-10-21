export const SORTS = ["newest", "popular", "rating", "price_asc", "price_desc"] as const;
export const LEVELS = ["beginner", "intermediate", "advanced"] as const;

export interface Filters {
  q: string;
  category: string;
  level: string;
  pricing: string;
  sort: string;
  page: number;
}

export function readFilters(sp: URLSearchParams): Filters {
  const page = Number(sp.get("page"));
  const sort = sp.get("sort") ?? "newest";
  const level = sp.get("level") ?? "";
  const pricing = sp.get("pricing") ?? "";
  return {
    q: sp.get("q") ?? "",
    category: sp.get("category") ?? "",
    level: (LEVELS as readonly string[]).includes(level) ? level : "",
    pricing: pricing === "free" || pricing === "paid" ? pricing : "",
    sort: (SORTS as readonly string[]).includes(sort) ? sort : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function toQueryString(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.category) sp.set("category", f.category);
  if (f.level) sp.set("level", f.level);
  if (f.pricing) sp.set("pricing", f.pricing);
  if (f.sort !== "newest") sp.set("sort", f.sort);
  if (f.page > 1) sp.set("page", String(f.page));
  return sp.toString();
}

