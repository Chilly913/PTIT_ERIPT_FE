const nf = new Intl.NumberFormat("vi-VN");
export const fmtNumber = (n: number) => nf.format(n);

export function fmtPercent(part: number, total: number) {
  if (!total) return "0%";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format((part / total) * 100)}%`;
}

/** "2026-10-17" -> "17/10" */
export function fmtDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "2026-10-17" -> "17/10/2026" */
export function fmtFullDay(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtTime(d: Date) {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];
export function fmtRelative(iso: string, now = Date.now()) {
  const diff = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "vừa xong";
}
