import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/verify-email";
import { messages } from "@/lib/messages";

export const metadata: Metadata = { title: messages.auth.verify.title };

/** Mailed link: /verify-email?expires=..&signature=..&id=..&hash=.. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; hash?: string; expires?: string; signature?: string }>;
}) {
  const sp = await searchParams;
  return <VerifyEmail id={sp.id} hash={sp.hash} expires={sp.expires} signature={sp.signature} />;
}