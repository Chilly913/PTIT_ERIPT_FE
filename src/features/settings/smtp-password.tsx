"use client";

import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Badge, Button, FieldError, Input, Label } from "@/components/ui";
import { settingsMessages as t } from "./messages";

export type PasswordState = "keep" | "change" | "clear";

/**
 * The stored secret is never fetched: only whether one exists. Shows "Đã đặt" with change/clear
 * actions; typing a new value is the only way a secret leaves the browser.
 */
export function SmtpPassword({
  hasPassword,
  state,
  onState,
  error,
  inputProps,
}: {
  hasPassword: boolean;
  state: PasswordState;
  onState: (s: PasswordState) => void;
  error?: string;
  inputProps: UseFormRegisterReturn;
}) {
  const uid = useId();
  const errId = `${uid}-err`;
  const hintId = `${uid}-hint`;
  return (
    <div>
      <Label htmlFor={state === "change" ? `${uid}-pw` : undefined}>{t.smtp.password}</Label>
      {state === "change" ? (
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-48 flex-1">
            <Input
              id={`${uid}-pw`}
              type="password"
              autoComplete="new-password"
              placeholder={t.smtp.passwordNew}
              maxLength={255}
              invalid={!!error}
              aria-describedby={[hintId, error ? errId : ""].filter(Boolean).join(" ")}
              autoFocus
              {...inputProps}
            />
          </div>
          <Button variant="ghost" onClick={() => onState("keep")}>{t.smtp.passwordCancel}</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {state === "clear" ? (
            <p className="text-sm text-danger">{t.smtp.passwordWillClear}</p>
          ) : (
            <Badge tone={hasPassword ? "success" : "neutral"}>{hasPassword ? t.smtp.passwordSet : t.smtp.passwordUnset}</Badge>
          )}
          {state === "clear" ? (
            <Button variant="outline" size="sm" onClick={() => onState("keep")}>{t.smtp.passwordCancel}</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onState("change")}>
                {hasPassword ? t.smtp.passwordChange : t.smtp.passwordSetNew}
              </Button>
              {hasPassword && (
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => onState("clear")}>
                  {t.smtp.passwordClear}
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {state === "change" && <p id={hintId} className="mt-1 text-sm text-muted">{t.smtp.passwordNewHint}</p>}
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}
