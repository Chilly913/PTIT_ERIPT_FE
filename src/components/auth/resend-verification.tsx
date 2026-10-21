"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api";
import { messages } from "@/lib/messages";
import { useCountdown } from "@/hooks/use-countdown";

/** Button that re-sends the verification mail for `email` and shows the cooldown on 429. */
export function ResendVerificationButton({ email, label = messages.auth.login.resend }: { email: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const { remaining, start } = useCountdown();
  const toast = useToast();

  async function onClick() {
    setLoading(true);
    try {
      await api.post("/auth/resend-verification-email", { email });
      toast.success(messages.auth.login.resent);
      start(30);
    } catch (e) {
      if (isApiError(e) && e.status === 429) start(e.retryAfter ?? 60);
      toast.error(e instanceof Error ? e.message : messages.common.unknownError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} loading={loading} disabled={remaining > 0 || !email}>
      {remaining > 0 ? messages.auth.login.retryIn(remaining) : label}
    </Button>
  );
}