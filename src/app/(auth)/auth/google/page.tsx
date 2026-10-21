import type { Metadata } from "next";
import { GoogleCallback } from "@/components/auth/google-callback";
import { messages } from "@/lib/messages";

// The URL carries the access token: never leak it through the Referer header.
export const metadata: Metadata = { title: messages.auth.google.title, referrer: "no-referrer" };

export default function GoogleCallbackPage() {
  return <GoogleCallback />;
}