"use client";

import type { FieldErrors, UseFieldArrayReturn, UseFormRegister } from "react-hook-form";
import { Button, FieldError, Input } from "@/components/ui";
import { settingsMessages as t } from "./messages";
import type { SettingsFormValues } from "./schema";
import { PlusIcon, TrashIcon } from "@/components/icons";

/** Dynamic rows of name -> URL. */
export function SocialLinksEditor({
  fields,
  register,
  append,
  remove,
  errors,
  rootError,
}: {
  fields: UseFieldArrayReturn<SettingsFormValues, "social">["fields"];
  register: UseFormRegister<SettingsFormValues>;
  append: UseFieldArrayReturn<SettingsFormValues, "social">["append"];
  remove: UseFieldArrayReturn<SettingsFormValues, "social">["remove"];
  errors: FieldErrors<SettingsFormValues>["social"];
  rootError?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-0.5 text-sm font-medium">{t.contact.social}</legend>
      <p className="mb-3 text-sm text-muted">{t.contact.socialDescription}</p>
      {fields.length === 0 && <p className="mb-3 rounded-lg border border-dashed border-border-strong p-4 text-center text-sm text-muted">{t.contact.empty}</p>}
      <ul className="space-y-3">
        {fields.map((f, i) => {
          const e = Array.isArray(errors) ? errors[i] : undefined;
          return (
            <li key={f.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <div className="min-w-0">
                <Input
                  aria-label={`${t.contact.rowLabel(i + 1)}: ${t.contact.socialName}`}
                  placeholder={t.contact.socialNamePlaceholder}
                  invalid={!!e?.name}
                  autoCapitalize="none"
                  spellCheck={false}
                  {...register(`social.${i}.name`)}
                />
                <FieldError>{e?.name?.message}</FieldError>
              </div>
              <Button variant="ghost" size="icon" className="sm:order-last" aria-label={t.contact.remove(i + 1)} onClick={() => remove(i)}>
                <TrashIcon aria-hidden className="size-4" />
              </Button>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <Input
                  type="url"
                  inputMode="url"
                  aria-label={`${t.contact.rowLabel(i + 1)}: ${t.contact.socialUrl}`}
                  placeholder={t.contact.socialUrlPlaceholder}
                  invalid={!!e?.url}
                  {...register(`social.${i}.url`)}
                />
                <FieldError>{e?.url?.message}</FieldError>
              </div>
            </li>
          );
        })}
      </ul>
      <FieldError>{rootError}</FieldError>
      <Button variant="outline" size="sm" className="mt-3" disabled={fields.length >= 20} onClick={() => append({ name: "", url: "" })}>
        <PlusIcon aria-hidden className="size-4" />
        {t.contact.add}
      </Button>
    </fieldset>
  );
}
