"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, isApiError } from "@/lib/api";
import { homeFor } from "@/lib/auth-utils";
import { applyApiErrors } from "@/lib/form-errors";
import { messages } from "@/lib/messages";
import type { User } from "@/lib/types";
import { useCountdown } from "@/hooks/use-countdown";
import { PasswordInput } from "./password-input";
import { GoogleButton } from "./google-button";
import { Logo } from "@/components/brand/logo";
import { ResendVerificationButton } from "./resend-verification";

const t = messages.auth;
const schema = z.object({
  email: z.string().trim().min(1, messages.common.required).email(t.invalidEmail),
  password: z.string().min(1, messages.common.required),
});
type Values = z.infer<typeof schema>;

export function LoginForm({ next, notice }: { next: string | null; notice?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const { remaining, start } = useCountdown();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: Values) {
    setFormError(null);
    setUnverifiedEmail(null);
    try {
      const res = await apiRequest<{ user: User }>("POST", "/session/login", { body: values });
      router.replace(next ?? homeFor(res.user));
      router.refresh();
    } catch (e) {
      if (isApiError(e)) {
        if (e.status === 403 && e.requiresVerification) {
          setUnverifiedEmail(e.email ?? getValues("email"));
          return;
        }
        if (e.status === 429) {
          start(e.retryAfter ?? 60);
          setFormError(t.login.tooMany);
          return;
        }
        if (e.status === 401) {
          setFormError(t.login.invalid);
          return;
        }
      }
      setFormError(applyApiErrors(e, setError, ["email", "password"]) ?? messages.common.unknownError);
    }
  }

  return (
    <div className="auth-glass-card">
      <div className="auth-brand-row">
        <Logo className="h-16 w-auto" />
      </div>

      <div className="auth-heading">
        <h2 className="auth-heading-title">Đăng nhập</h2>
      </div>

      <div className="mb-4 space-y-3" aria-live="polite">
        {notice && <Alert tone="success">{notice}</Alert>}
        {formError && <div className="auth-notice">{formError}</div>}
        {unverifiedEmail && (
          <Alert tone="warning" title={t.login.unverifiedTitle}>
            <p>{t.login.unverified}</p>
            <div className="mt-2">
              <ResendVerificationButton email={unverifiedEmail} />
            </div>
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="auth-field-row">
          <span className="auth-field-label">Tên đăng nhập / Email</span>
          <Input type="email" autoComplete="username" inputMode="email" placeholder="email@example.com" autoFocus className="auth-input" {...register("email")} />
          {errors.email && <span className="auth-field-desc">{errors.email.message}</span>}
        </div>

        <div className="auth-field-row">
          <span className="auth-field-label">Mật khẩu</span>
          <div className="auth-password-wrap">
            <PasswordInput autoComplete="current-password" className="auth-input" {...register("password")} />
          </div>
          {errors.password && <span className="auth-field-desc">{errors.password.message}</span>}
        </div>

        <div className="auth-remember-forgot">
          <label className="auth-remember">
            <input type="checkbox" defaultChecked />
            <span>Ghi nhớ đăng nhập</span>
          </label>
          <Link href="/forgot-password" className="auth-forgot-link">{t.login.forgot}</Link>
        </div>

        <Button type="submit" className="auth-submit-btn" loading={isSubmitting} disabled={remaining > 0}>
          {remaining > 0 ? t.login.retryIn(remaining) : t.login.submit}
        </Button>
      </form>

      <div className="auth-divider"><span>hoặc</span></div>
      <GoogleButton next={next} />

      <p className="auth-foot">
        {t.login.noAccount}{" "}
        <Link href="/register" className="font-medium">{t.login.register}</Link>
      </p>

    </div>
  );
}
