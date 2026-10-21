import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/auth-utils";
import { redirectIfAuthenticated } from "@/lib/guards";
import { messages } from "@/lib/messages";

export const metadata: Metadata = { title: messages.auth.login.title };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  await redirectIfAuthenticated(sp.next);
  return <LoginForm next={safeNext(sp.next)} notice={sp.reset ? messages.auth.login.passwordReset : undefined} />;
}