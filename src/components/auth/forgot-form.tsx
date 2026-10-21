"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/config";
import { api, isApiError } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";
import { messages } from "@/lib/messages";
import { Logo } from "@/components/brand/logo";
import { useCountdown } from "@/hooks/use-countdown";

const t = messages.auth;
const schema = z.object({ email: z.string().trim().min(1, messages.common.required).email(t.invalidEmail) });
type Values = z.infer<typeof schema>;

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { remaining, start } = useCountdown();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await api.post("/auth/forgot-password", values);
      setSent(true);
      start(60);
    } catch (e) {
      if (isApiError(e) && e.status === 429) start(e.retryAfter ?? 60);
      setFormError(applyApiErrors(e, setError, ["email"]));
    }
  }

  return (
    <div className="auth-glass-card">
      <div className="auth-brand-row">
        <Logo className="h-16 w-auto" />
      </div>

      <div className="auth-heading">
        <span className="auth-heading-label">Khôi phục tài khoản</span>
        <h2 className="auth-heading-title">Quên mật khẩu?</h2>
        <p className="auth-heading-desc">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
      </div>

      <div aria-live="polite" className="mb-4 space-y-3 empty:hidden">
        {sent && <div className="auth-success-state">
          <div className="auth-success-icon"><span className="size-7">✉️</span></div>
          <h2 className="auth-success-title">Đã gửi hướng dẫn</h2>
          <p className="auth-success-text">Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.</p>
        </div>}
        {formError && <div className="auth-notice">{formError}</div>}
      </div>

      {!sent && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="auth-field-row">
            <span className="auth-field-label">Email</span>
            <span className="auth-field-uni">University Name</span>
            <Input type="email" autoComplete="email" inputMode="email" placeholder="email@example.com" autoFocus className="auth-input" {...register("email")} />
            <span className="auth-field-desc">{errors.email?.message ?? "Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu tới địa chỉ này."}</span>
          </div>
          <Button type="submit" className="auth-submit-btn" loading={isSubmitting} disabled={remaining > 0}>
            {remaining > 0 ? t.login.retryIn(remaining) : t.forgot.submit}
          </Button>
        </form>
      )}

      {!sent && (
        <p className="auth-foot">Nhớ lại mật khẩu? <Link href="/login" className="font-medium">Đăng nhập</Link></p>
      )}

      <div className="auth-brand-footer">
        <span>{APP_NAME}</span> · University Name &amp; Logo
      </div>
    </div>
  );
}
