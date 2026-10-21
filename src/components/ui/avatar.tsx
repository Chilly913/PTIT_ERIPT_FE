import { cn } from "@/lib/cn";

const sizes = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-12 text-base" };

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const last = parts[parts.length - 1];
  const first = parts.length > 1 ? parts[0] : "";
  return (first[0] ?? "").concat(last[0] ?? "").toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: { name?: string | null; src?: string | null; size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary-soft-foreground", sizes[size], className)}
      aria-hidden={name ? undefined : true}
      title={name ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </span>
  );
}