"use client";

import { cn } from "@/lib/cn";
import { controlBase, useFieldProps } from "./field";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ className, invalid, id, ref, ...props }: InputProps) {
  const f = useFieldProps();
  const isInvalid = invalid ?? f?.invalid;
  return (
    <input
      ref={ref}
      id={id ?? f?.id}
      aria-invalid={isInvalid || undefined}
      aria-describedby={props["aria-describedby"] ?? f?.describedBy}
      className={cn(controlBase, "h-9", className)}
      {...props}
    />
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, invalid, id, ref, ...props }: TextareaProps) {
  const f = useFieldProps();
  const isInvalid = invalid ?? f?.invalid;
  return (
    <textarea
      ref={ref}
      id={id ?? f?.id}
      aria-invalid={isInvalid || undefined}
      aria-describedby={props["aria-describedby"] ?? f?.describedBy}
      className={cn(controlBase, "min-h-24 py-2", className)}
      {...props}
    />
  );
}