import Image from "next/image";
import { cn } from "@/lib/cn";

/** Official ERIPT logo (Viện Kinh tế Bưu điện). Size it with a height class; width follows the 1024x434 ratio. */
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/eript-logo.png"
      alt="ERIPT – Viện Kinh tế Bưu điện"
      width={1024}
      height={434}
      priority={priority}
      className={cn("h-10 w-auto", className)}
    />
  );
}
