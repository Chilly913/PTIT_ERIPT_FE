import sanitizeHtml from "sanitize-html";
import { cn } from "@/lib/cn";
import { richClass, sanitizeOptions } from "@/features/site/sanitize-config";

const LOOKS_LIKE_HTML = /<\/?[a-z][\s\S]*>/i;

/** Server component: sanitises instructor HTML with an allow-list, plain text keeps its line breaks. */
export function SafeHtml({ html, className }: { html: string | null | undefined; className?: string }) {
  const src = (html ?? "").trim();
  if (!src) return null;
  if (!LOOKS_LIKE_HTML.test(src)) {
    return <div className={cn("whitespace-pre-line text-[1rem] leading-7", className)}>{src}</div>;
  }
  const clean = sanitizeHtml(src, sanitizeOptions);
  return <div className={cn(richClass, className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
