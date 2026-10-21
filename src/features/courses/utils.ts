import type { CourseStatus, Section } from "./types";

/** Mirrors the API slug (Vietnamese transliteration, lower-case, dashes). */
export function slugify(input: string): string {
  return input
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const nf = new Intl.NumberFormat("vi-VN");
export const fmtNumber = (n: number) => nf.format(n);
export const fmtPrice = (n: number | null | undefined) => (!n ? "Miễn phí" : `${nf.format(n)} ₫`);

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
export function fmtRelative(iso: string | null | undefined) {
  if (!iso) return "-";
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return "vừa xong";
}

export function fmtDuration(seconds: number) {
  if (!seconds) return "";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${Math.max(m, 1)} phút`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} giờ ${r} phút` : `${h} giờ`;
}

/** ISO string -> value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type VideoEmbed = { kind: "youtube" | "vimeo" | "file"; src: string } | null;
export function parseVideoUrl(raw: string | null | undefined): VideoEmbed {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : null);
      if (id) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` };
    }
    if (u.protocol === "http:" || u.protocol === "https:") return { kind: "file", src: v };
  } catch {
    return null;
  }
  return null;
}

export function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function stripHtml(html: string | null | undefined) {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function totalLessons(sections: Section[]) {
  return sections.reduce((n, s) => n + s.lessons.length, 0);
}
export function totalSeconds(sections: Section[]) {
  return sections.reduce((n, s) => n + s.lessons.reduce((m, l) => m + (l.duration || 0), 0), 0);
}

export const STATUS_ORDER: CourseStatus[] = ["draft", "pending_review", "published", "closed", "rejected"];

/** "02/11 08:00" style date used in compact badges. */
export function fmtShort(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
