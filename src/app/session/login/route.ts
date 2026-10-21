import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/server-config";
import { setSessionCookie } from "@/lib/session";
import { sameOrigin } from "@/lib/origin";

/** POST {email,password} -> Go login; stores the token in an httpOnly cookie, returns {user}. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "API unreachable" }, { status: 502 });
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    // Pass 4xx bodies (422 errors, 403 requires_verification, 429 + Retry-After) through untouched.
    const headers = new Headers({ "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" });
    const retry = upstream.headers.get("Retry-After");
    if (retry) headers.set("Retry-After", retry);
    return new NextResponse(text, { status: upstream.status, headers });
  }

  let payload: { access_token?: string; user?: unknown };
  try {
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ message: "Bad response from API" }, { status: 502 });
  }
  if (!payload.access_token) return NextResponse.json({ message: "Bad response from API" }, { status: 502 });

  const res = NextResponse.json({ user: payload.user });
  setSessionCookie(res, payload.access_token);
  res.headers.set("Cache-Control", "no-store");
  return res;
}