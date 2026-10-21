import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE } from "@/lib/config";

/**
 * Optimistic gate: no cookie -> /login?next=... (cheap, runs before rendering).
 * The real check (token validity + role) happens server-side in the layouts.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get(TOKEN_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Matcher values must be static: keep in sync with PROTECTED_PREFIXES in lib/config.ts.
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};