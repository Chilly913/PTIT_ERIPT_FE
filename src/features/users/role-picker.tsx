"use client";

import { Checkbox } from "@/components/ui";
import type { RoleInfo } from "./types";

/** Checkbox group for choosing roles; the parent owns the value. */
export function RolePicker({
  roles,
  value,
  onChange,
  disabled,
  labelledBy,
  describedBy,
}: {
  roles: RoleInfo[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  labelledBy?: string;
  describedBy?: string;
}) {
  const toggle = (name: string, on: boolean) => onChange(on ? [...value, name] : value.filter((r) => r !== name));
  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className="grid gap-2 sm:grid-cols-2">
      {roles.map((r) => (
        <div key={r.name} className="rounded-lg border border-border px-3 py-2">
          <Checkbox
            label={r.label}
            checked={value.includes(r.name)}
            disabled={disabled}
            onChange={(e) => toggle(r.name, e.target.checked)}
          />
        </div>
      ))}
    </div>
  );
}
