"use client";

import { createContext, useContext, useId } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-foreground", className)} {...props} />;
}

export function FieldError({ id, children, className }: { id?: string; children?: React.ReactNode; className?: string }) {
  // Always rendered so assistive tech announces changes (aria-live).
  return (
    <p id={id} role="alert" aria-live="polite" className={cn("mt-1 text-sm text-danger", !children && "hidden", className)}>
      {children}
    </p>
  );
}

interface FieldCtx {
  id: string;
  describedBy?: string;
  invalid: boolean;
}
const FieldContext = createContext<FieldCtx | null>(null);

/** Props to spread on the control inside a <Field> (done automatically by Input/Textarea/Select). */
export function useFieldProps() {
  return useContext(FieldContext);
}

/**
 * Label + control + hint + error with correct aria wiring.
 * Place an Input/Textarea/Select/Checkbox inside; they pick up id/aria from context.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const uid = useId();
  const id = `f${uid.replace(/:/g, "")}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = `${id}-err`;
  const describedBy = [hintId, error ? errId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error }}>
      <div className={className}>
        {label && (
          <Label htmlFor={id}>
            {label}
            {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
          </Label>
        )}
        {children}
        {hint && <p id={hintId} className="mt-1 text-sm text-muted">{hint}</p>}
        <FieldError id={errId}>{error}</FieldError>
      </div>
    </FieldContext.Provider>
  );
}

export const controlBase =
  "w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-3 text-(color:--input-fg) placeholder:text-(color:--input-placeholder) transition-colors " +
  "hover:border-(--input-border-hover) hover:bg-(--input-hover-bg) focus-visible:border-(--input-focus-ring) " +
  "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-(--input-focus-ring) " +
  "disabled:cursor-not-allowed disabled:border-(--border) disabled:bg-(--input-disabled-bg) disabled:text-(color:--input-disabled-fg) " +
  "aria-[invalid=true]:border-(--input-error)";