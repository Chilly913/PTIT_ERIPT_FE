import { NextResponse, type NextRequest } from "next/server";
import { serverApi } from "@/lib/server-api";
import { clearSessionCookie } from "@/lib/session";
import { sameOrigin } from "@/lib/origin";

/** POST: revoke the token at the API (best effort) and clear the cookie. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await serverApi("/auth/logout", { method: "POST" });
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  res.headers.set("Cache-Control", "no-store");
  return res;
}