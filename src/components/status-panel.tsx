import { cn } from "@/lib/cn";

/** Centered full-block status message used by 403 / 404 / error screens. */
export function StatusPanel({
  code,
  title,
  text,
  actions,
  className,
}: {
  code?: string;
  title: string;
  text?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center", className)}>
      {code && <p className="text-6xl font-extrabold tracking-tight text-primary">{code}</p>}
      <h1 className="mt-3 text-2xl font-bold">{title}</h1>
      {text && <p className="mt-2 text-muted">{text}</p>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}