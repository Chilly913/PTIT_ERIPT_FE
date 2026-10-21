"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { homeFor, safeNext } from "@/lib/auth-utils";
import { messages } from "@/lib/messages";
import type { User } from "@/lib/types";
import { SpinnerIcon, XCircleIcon } from "@/components/icons";

const t = messages.auth.google;

/** Landing page of the Go Google flow: /auth/google?token=... | ?error=... */
export function GoogleCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const err = params.get("error");
    // Remove the token from the address bar / history immediately.
    window.history.replaceState(null, "", window.location.pathname);

    if (err || !token) {
      // Deferred to avoid a synchronous state update inside the effect body.
      queueMicrotask(() => setError(err || t.missing));
      return;
    }
    apiRequest<{ user: User }>("POST", "/session/google", { body: { token } })
      .then((res) => {
        const next = safeNext(sessionStorage.getItem("eript-next"));
        sessionStorage.removeItem("eript-next");
        router.replace(next ?? homeFor(res.user));
        router.refresh();
      })
      .catch((e: Error) => setError(e.message));
  }, [router]);

  if (error) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <XCircleIcon className="size-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t.failTitle}</h1>
        <div className="my-4 text-left"><Alert tone="danger">{error}</Alert></div>
        <Link href="/login" className={buttonStyles({ className: "w-full" })}>{t.back}</Link>
      </div>
    );
  }
  return (
    <div className="text-center" role="status">
      <SpinnerIcon className="mx-auto mb-4 size-8 animate-spin text-primary" aria-hidden />
      <h1 className="text-xl font-semibold">{t.title}</h1>
      <p className="mt-2 text-muted">{t.loading}</p>
    </div>
  );
}