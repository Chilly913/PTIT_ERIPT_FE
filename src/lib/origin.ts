import type { NextRequest } from "next/server";

/** CSRF defence for state-changing handlers: a present Origin must match the request host. */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-origin GET navigations
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}