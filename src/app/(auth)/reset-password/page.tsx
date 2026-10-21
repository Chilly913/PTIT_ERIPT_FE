import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/reset-form";
import { messages } from "@/lib/messages";

export const metadata: Metadata = { title: messages.auth.reset.title, referrer: "no-referrer" };

/** Mailed link: /reset-password?token=...&email=... */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token, email } = await searchParams;
  return <ResetForm token={token} email={email} />;
}