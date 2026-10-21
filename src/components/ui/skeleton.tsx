import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded-md bg-border", className)} {...props} />;
}