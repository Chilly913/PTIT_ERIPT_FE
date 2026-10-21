"use client";

import { cn } from "@/lib/cn";

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
}

export function Switch({ checked, onCheckedChange, label, className, disabled, ...props }: SwitchProps) {
  const btn = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-(--switch-on-bg)" : "bg-(--switch-off-bg)",
        !label && className,
      )}
      {...props}
    >
      <span className={cn("block size-4 rounded-full bg-(--switch-thumb) transition-transform", checked ? "translate-x-5.5" : "translate-x-1")} />
    </button>
  );
  if (!label) return btn;
  return (
    <span className={cn("flex w-fit items-center gap-2.5", className)}>
      {btn}
      <span className="text-foreground">{label}</span>
    </span>
  );
}