import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./server-api";
import { homeFor, safeNext } from "./auth-utils";
import type { User } from "./types";

/** For auth pages: bounce signed-in users to their home (or `next`). */
export async function redirectIfAuthenticated(next?: string | string[] | null) {
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next) ?? homeFor(user));
}

/** For protected layouts: returns the user or redirects to /login?next=... */
export async function requireUser(returnTo: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}