import { cn } from "@/lib/cn";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: DivProps) {
  return <div className={cn("rounded-xl border border-(--card-border) bg-(--card-bg)", className)} {...props} />;
}
export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn("flex flex-col gap-1 border-b border-(--card-divider) px-5 py-4", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}
export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn("p-5", className)} {...props} />;
}
export function CardFooter({ className, ...props }: DivProps) {
  return <div className={cn("flex items-center justify-end gap-2 border-t border-(--card-divider) px-5 py-3", className)} {...props} />;
}