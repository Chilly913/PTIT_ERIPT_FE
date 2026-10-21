"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, buttonStyles } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { api } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";
import { messages } from "@/lib/messages";
import { Logo } from "@/components/brand/logo";
import { PasswordInput } from "./password-input";

const t = messages.auth;
const schema = z
  .object({
    password: z.string().min(6, t.passwordMin),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ["password_confirmation"], message: t.passwordMismatch });
type Values = z.infer<typeof schema>;

export function ResetForm({ token, email }: { token?: string; email?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", password_confirmation: "" } });

  if (!token || !email) {
    return (
      <div className="auth-glass-card text-center">
        <div className="auth-brand-row">
          <Logo className="h-16 w-auto" />
        </div>

        <h2 className="auth-heading-title">{t.reset.title}</h2>
        <div className="my-6"><div className="auth-notice">{t.reset.invalidLink}</div></div>
        <Link href="/forgot-password" className={buttonStyles({ className: "auth-submit-btn" })}>{t.reset.requestNew}</Link>

        <div className="auth-brand-footer mt-8">
          <span>{APP_NAME}</span> · University Name &amp; Logo
        </div>
      </div>
    );
  }

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await api.post("/auth/reset-password", { token, email, ...values });
      router.replace("/login?reset=1");
    } catch (e) {
      setFormError(applyApiErrors(e, setError, ["password", "password_confirmation"]));
    }
  }

  return (
    <div className="auth-glass-card">
      <div className="auth-brand-row">
        <Logo className="h-16 w-auto" />
      </div>

      <div className="auth-heading">
        <span className="auth-heading-label">Đặt lại mật khẩu</span>
        <h2 className="auth-heading-title">{t.reset.title}</h2>
        <p className="auth-heading-desc">{t.reset.subtitle}</p>
      </div>

      <div aria-live="polite" className="mb-4 empty:hidden">{formError && <div className="auth-notice">{formError}</div>}</div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Helps password managers associate the new password with the account. */}
        <input type="email" value={email} readOnly autoComplete="username" hidden />
        <div className="auth-field-row">
          <span className="auth-field-label">Mật khẩu mới</span>
          <span className="auth-field-uni">University Name</span>
          <PasswordInput autoComplete="new-password" autoFocus className="auth-input" {...register("password")} />
          <span className="auth-field-desc">{t.passwordMin}</span>
        </div>
        <div className="auth-field-row">
          <span className="auth-field-label">Xác nhận mật khẩu mới</span>
          <span className="auth-field-uni">University Name</span>
          <PasswordInput autoComplete="new-password" className="auth-input" {...register("password_confirmation")} />
          <span className="auth-field-desc">{errors.password_confirmation?.message ?? "Nhập lại mật khẩu để xác nhận."}</span>
        </div>
        <Button type="submit" className="auth-submit-btn" loading={isSubmitting}>{t.reset.submit}</Button>
      </form>

      <div className="auth-brand-footer">
        <span>{APP_NAME}</span> · University Name &amp; Logo
      </div>
    </div>
  );
}
