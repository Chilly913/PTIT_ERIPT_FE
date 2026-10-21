import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "./config";

const MAX_AGE = 60 * 60 * 24 * 14; // 14 days; the Go token may expire earlier -> 401 clears it

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Bearer token of the current request (server components / route handlers). */
export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value || null;
}

/** Set the session cookie on a route-handler response. */
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(TOKEN_COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(TOKEN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}