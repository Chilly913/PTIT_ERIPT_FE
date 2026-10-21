"use client";

import { cn } from "@/lib/cn";
import { controlBase, useFieldProps } from "./field";
import { ChevronDownIcon } from "@/components/icons";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  ref?: React.Ref<HTMLSelectElement>;
}

/** Styled native <select>: pass <option> children. Works with react-hook-form `register`. */
export function Select({ className, invalid, id, ref, children, ...props }: SelectProps) {
  const f = useFieldProps();
  const isInvalid = invalid ?? f?.invalid;
  return (
    <div className="relative">
      <select
        ref={ref}
        id={id ?? f?.id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={props["aria-describedby"] ?? f?.describedBy}
        className={cn(controlBase, "h-9 appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}