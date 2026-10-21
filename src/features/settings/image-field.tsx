"use client";

import { UploadField } from "@/components/upload-field";
import { settingsMessages as t } from "./messages";

const VALID = /^(https?:\/\/\S+|\/\S*)$/i;

/** Image setting (logo, favicon): drag-and-drop upload with a typed-path fallback. */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  serverError,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  serverError?: string;
}) {
  const url = value.trim();
  const invalid = url !== "" && !VALID.test(url);
  return <UploadField label={label} hint={hint ?? "PNG, JPG, GIF hoặc WebP, tối đa 5 MB."} value={value} onChange={onChange} shape="logo" error={serverError ?? (invalid ? t.image.invalid : null)} />;
}
