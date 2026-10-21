import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forgot-form";
import { redirectIfAuthenticated } from "@/lib/guards";
import { messages } from "@/lib/messages";

export const metadata: Metadata = { title: messages.auth.forgot.title };

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();
  return <ForgotForm />;
}