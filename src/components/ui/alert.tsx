import { cn } from "@/lib/cn";
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "@/components/icons";

const tones = {
  info: { cls: "bg-info-soft text-info", Icon: InfoIcon },
  success: { cls: "bg-success-soft text-success", Icon: CheckCircleIcon },
  warning: { cls: "bg-warning-soft text-warning", Icon: AlertTriangleIcon },
  danger: { cls: "bg-danger-soft text-danger", Icon: XCircleIcon },
};

/** Inline message box. `danger` is announced assertively, others politely. */
export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof tones; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg p-3", cls, className)}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
    </div>
  );
}