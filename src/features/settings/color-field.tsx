"use client";

import { useId } from "react";
import { FieldError, Input, Label } from "@/components/ui";
import { settingsMessages as t } from "./messages";
import { DEFAULT_COLOR } from "./schema";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Native colour picker + hex input, kept in sync. Value is "#RRGGBB" (or whatever the user is typing). */
export function ColorField({ value, onChange, onBlur, error }: { value: string; onChange: (v: string) => void; onBlur: () => void; error?: string }) {
  const uid = useId();
  const valid = HEX.test(value.trim());
  const errId = `${uid}-err`;
  return (
    <div>
      <Label htmlFor={`${uid}-hex`}>{t.general.primaryColorHex}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={t.general.primaryColorPicker}
          value={valid ? value.trim().toLowerCase() : DEFAULT_COLOR.toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="size-9 shrink-0 cursor-pointer rounded-lg border border-border-strong bg-surface p-1"
        />
        <Input
          id={`${uid}-hex`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          invalid={!!error}
          aria-describedby={error ? errId : undefined}
          className="max-w-36 font-mono uppercase"
          placeholder={DEFAULT_COLOR}
        />
      </div>
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}
