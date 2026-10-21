import { siteMessages as t } from "./messages";

const vnd = new Intl.NumberFormat("vi-VN");

export function formatPrice(price: number | null | undefined): string {
  if (!price || price <= 0) return t.card.free;
  return `${vnd.format(price)} ₫`;
}

export function isFree(price: number | null | undefined): boolean {
  return !price || price <= 0;
}

/** 3725 -> "1:02:05", 95 -> "1:35". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

/** 5400 -> "1 giờ 30 phút", 600 -> "10 phút". */
export function humanDuration(seconds: number): string {
  const total = Math.max(0, Math.round((seconds || 0) / 60));
  if (total < 1) return seconds > 0 ? "< 1 phút" : "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} phút`;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff)) return "";
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatDate(iso);
}

export function levelLabel(level: string | null | undefined): string {
  if (!level) return "";
  return t.levels[level] ?? level;
}

export function initialsOf(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const a = parts[0][0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (a + b).toUpperCase();
}

/** Stable tint index (0..n-1) derived from an id, for flat placeholder blocks. */
export function tintOf(id: number, n = 5): number {
  return Math.abs(Math.trunc(id)) % n;
}

export function toStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : typeof x === "object" && x ? String((x as { text?: unknown; title?: unknown }).text ?? (x as { title?: unknown }).title ?? "") : String(x))).filter((s) => s.trim());
}
