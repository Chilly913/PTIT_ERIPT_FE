"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { messages } from "@/lib/messages";
import { ResendVerificationButton } from "./resend-verification";
import { CheckCircleIcon, XCircleIcon } from "@/components/icons";

const t = messages.auth.verify;
type State = { kind: "loading" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

interface Params {
  id?: string;
  hash?: string;
  expires?: string;
  signature?: string;
}

/**
 * Mailed link: /verify-email?expires=&signature=&id=&hash=
 * -> GET /api/auth/verify-email/:id/:hash?expires=&signature=
 */
export function VerifyEmail({ id, hash, expires, signature }: Params) {
  const valid = Boolean(id && hash && expires && signature);
  const [state, setState] = useState<State>(valid ? { kind: "loading" } : { kind: "error", message: t.missing });
  const [email, setEmail] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!valid || started.current) return;
    started.current = true; // StrictMode runs effects twice; the endpoint is rate limited
    api
      .get<{ message?: string }>(`/auth/verify-email/${encodeURIComponent(id!)}/${encodeURIComponent(hash!)}`, {
        query: { expires, signature },
      })
      .then(() => setState({ kind: "ok", message: t.success }))
      .catch((e: Error) => setState({ kind: "error", message: e.message || t.failFallback }));
  }, [valid, id, hash, expires, signature]);

  return (
    <div className="text-center" aria-live="polite">
      {state.kind === "loading" && (
        <>
          <Spinner className="mx-auto mb-4 size-8 text-primary" />
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <p className="mt-2 text-muted">{t.loading}</p>
        </>
      )}
      {state.kind === "ok" && (
        <>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircleIcon className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.successTitle}</h1>
          <p className="mt-2 mb-6 text-muted">{state.message}</p>
          <Link href="/login" className={buttonStyles({ size: "lg", className: "w-full" })}>{t.toLogin}</Link>
        </>
      )}
      {state.kind === "error" && (
        <>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <XCircleIcon className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.failTitle}</h1>
          <div className="my-4 text-left"><Alert tone="danger">{state.message}</Alert></div>
          <div className="space-y-3 rounded-lg border border-border p-4 text-left">
            <p className="font-medium">{t.resendTitle}</p>
            <Field>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={messages.auth.emailPlaceholder} aria-label={messages.auth.email} />
            </Field>
            <ResendVerificationButton email={email.trim()} label={t.resend} />
          </div>
          <Link href="/login" className={buttonStyles({ variant: "link", className: "mt-4" })}>{t.toLogin}</Link>
        </>
      )}
    </div>
  );
}