import { SpinnerIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export function Spinner({ className, label = "Đang tải" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex">
      <SpinnerIcon className={cn("size-4 animate-spin", className)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
