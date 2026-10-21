import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { redirectIfAuthenticated } from "@/lib/guards";
import { messages } from "@/lib/messages";

export const metadata: Metadata = { title: messages.auth.register.title };

export default async function RegisterPage() {
  await redirectIfAuthenticated();
  return <RegisterForm />;
}