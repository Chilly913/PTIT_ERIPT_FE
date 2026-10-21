"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/icons";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

export function Checkbox({ label, className, id, ref, ...props }: CheckboxProps) {
  const uid = useId();
  const cid = id ?? `cb${uid.replace(/:/g, "")}`;
  return (
    <label htmlFor={cid} className={cn("inline-flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed has-disabled:opacity-60", className)}>
      <span className="relative inline-flex size-4.5 shrink-0">
        <input
          ref={ref}
          id={cid}
          type="checkbox"
          className="peer size-full cursor-[inherit] appearance-none rounded-[5px] border border-(--checkbox-border) bg-(--checkbox-bg) checked:border-(--checkbox-checked-bg) checked:bg-(--checkbox-checked-bg) indeterminate:border-(--checkbox-checked-bg) indeterminate:bg-(--checkbox-checked-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          {...props}
        />
        <CheckIcon aria-hidden className="pointer-events-none absolute inset-0 m-auto size-3.5 text-(color:--checkbox-checked-fg) opacity-0 peer-checked:opacity-100" strokeWidth={2.5} />
      </span>
      {label && <span className="text-foreground">{label}</span>}
    </label>
  );
}