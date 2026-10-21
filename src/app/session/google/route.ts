import { NextResponse, type NextRequest } from "next/server";
import { serverApi } from "@/lib/server-api";
import { setSessionCookie } from "@/lib/session";
import { sameOrigin } from "@/lib/origin";
import type { User } from "@/lib/types";

/** POST {token}: token handed over by the Google callback page. Validated with /auth/me, then stored. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 512) return NextResponse.json({ message: "Missing token" }, { status: 422 });

  const me = await serverApi<User>("/auth/me", { token });
  if (!me.ok) return NextResponse.json({ message: me.error?.message ?? "Invalid token" }, { status: me.status === 502 ? 502 : 401 });

  const res = NextResponse.json({ user: me.data });
  setSessionCookie(res, token);
  res.headers.set("Cache-Control", "no-store");
  return res;
}