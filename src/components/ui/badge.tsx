import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
const tones: Record<BadgeTone, string> = {
  neutral: "bg-(--badge-neutral-bg) text-(color:--badge-neutral-fg)",
  primary: "bg-(--badge-primary-bg) text-(color:--badge-primary-fg)",
  success: "bg-(--badge-success-bg) text-(color:--badge-success-fg)",
  warning: "bg-(--badge-warning-bg) text-(color:--badge-warning-fg)",
  danger: "bg-(--badge-danger-bg) text-(color:--badge-danger-fg)",
  info: "bg-(--badge-info-bg) text-(color:--badge-info-fg)",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}