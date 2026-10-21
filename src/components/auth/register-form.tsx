"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/config";
import { api, isApiError } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";
import { messages } from "@/lib/messages";
import { useCountdown } from "@/hooks/use-countdown";
import { PasswordInput } from "./password-input";
import { GoogleButton } from "./google-button";
import { ResendVerificationButton } from "./resend-verification";
import { Logo } from "@/components/brand/logo";
import { MailCheckIcon } from "@/components/icons";

const t = messages.auth;
const schema = z
  .object({
    name: z.string().trim().min(1, t.nameRequired).max(255),
    email: z.string().trim().min(1, messages.common.required).email(t.invalidEmail),
    password: z.string().min(6, t.passwordMin),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ["password_confirmation"], message: t.passwordMismatch });
type Values = z.infer<typeof schema>;
const FIELDS = ["name", "email", "password", "password_confirmation"] as const;

export function RegisterForm() {
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { remaining, start } = useCountdown();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "", password_confirmation: "" } });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const res = await api.post<{ email: string }>("/auth/register", values);
      setDone(res.email ?? values.email);
    } catch (e) {
      if (isApiError(e) && e.status === 429) {
        start(e.retryAfter ?? 60);
        setFormError(messages.common.tooMany);
        return;
      }
      setFormError(applyApiErrors(e, setError, FIELDS));
    }
  }

  if (done) {
    return (
      <div className="auth-glass-card text-center">
        <div className="auth-brand-row">
          <Logo className="h-16 w-auto" />
        </div>

        <div className="auth-success-state">
          <div className="auth-success-icon"><MailCheckIcon className="size-7" aria-hidden /></div>
          <h2 className="auth-success-title">{t.register.doneTitle}</h2>
          <p className="auth-success-text">{t.register.done(done)}</p>
        </div>

        <div className="flex flex-col items-center gap-3 mt-4">
          <ResendVerificationButton email={done} label={t.register.resend} />
          <Link href="/login" className={buttonStyles({ variant: "link" })}>{t.register.toLogin}</Link>
        </div>

        <div className="auth-brand-footer mt-8">
          <span>{APP_NAME}</span> · University Name &amp; Logo
        </div>
      </div>
    );
  }

  return (
    <div className="auth-glass-card">
      <div className="auth-brand-row">
        <Logo className="h-16 w-auto" />
      </div>

      <div className="auth-heading">
        <span className="auth-heading-label">Đăng ký</span>
        <h2 className="auth-heading-title">Tạo tài khoản mới</h2>
        <p className="auth-heading-desc">Đăng ký để bắt đầu học tập trên ERIPT LMS.</p>
      </div>

      <div aria-live="polite" className="mb-4 empty:hidden">{formError && <div className="auth-notice">{formError}</div>}</div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="auth-field-row">
          <span className="auth-field-label">Họ và tên</span>
          <span className="auth-field-uni">University Name</span>
          <Input autoComplete="name" autoFocus className="auth-input" {...register("name")} />
          <span className="auth-field-desc">{errors.name?.message ?? "Họ tên đầy đủ sẽ hiển thị trên chứng chỉ và hồ sơ học tập."}</span>
        </div>
        <div className="auth-field-row">
          <span className="auth-field-label">Email</span>
          <span className="auth-field-uni">University Name</span>
          <Input type="email" autoComplete="email" inputMode="email" placeholder={t.emailPlaceholder} className="auth-input" {...register("email")} />
          <span className="auth-field-desc">{errors.email?.message ?? "Email dùng để đăng nhập, khôi phục mật khẩu và nhận thông báo."}</span>
        </div>
        <div className="auth-field-row">
          <span className="auth-field-label">Mật khẩu</span>
          <span className="auth-field-uni">University Name</span>
          <PasswordInput autoComplete="new-password" className="auth-input" {...register("password")} />
          <span className="auth-field-desc">{t.passwordMin}</span>
        </div>
        <div className="auth-field-row">
          <span className="auth-field-label">Xác nhận mật khẩu</span>
          <span className="auth-field-uni">University Name</span>
          <PasswordInput autoComplete="new-password" className="auth-input" {...register("password_confirmation")} />
          <span className="auth-field-desc">{errors.password_confirmation?.message ?? "Nhập lại mật khẩu để xác nhận."}</span>
        </div>
        <Button type="submit" className="auth-submit-btn" loading={isSubmitting} disabled={remaining > 0}>
          {remaining > 0 ? t.login.retryIn(remaining) : t.register.submit}
        </Button>
      </form>

      <div className="auth-divider"><span>hoặc</span></div>
      <GoogleButton />

      <p className="auth-foot">
        {t.register.haveAccount}{" "}
        <Link href="/login" className="font-medium">{t.register.login}</Link>
      </p>

      <div className="auth-brand-footer">
        <span>{APP_NAME}</span> · University Name &amp; Logo
      </div>
    </div>
  );
}
