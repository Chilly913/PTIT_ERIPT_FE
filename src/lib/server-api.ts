import "server-only";
import { cache } from "react";
import { API_URL } from "./server-config";
import { getToken } from "./session";
import type { ApiErrorBody, User } from "./types";

export interface ServerResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: ApiErrorBody | null;
}

/**
 * Call the Go API directly from the server with the session token.
 * `path` is relative to `/api` (e.g. `/auth/me`). Never throws on HTTP errors.
 */
export async function serverApi<T = unknown>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown; token?: string | null } = {},
): Promise<ServerResult<T>> {
  const token = init.token === undefined ? await getToken() : init.token;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (init.body instanceof FormData) body = init.body;
  else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }
  try {
    const res = await fetch(`${API_URL}/api${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers,
      body,
      cache: "no-store",
    });
    const text = res.status === 204 ? "" : await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return res.ok
      ? { ok: true, status: res.status, data: json as T, error: null }
      : { ok: false, status: res.status, data: null, error: (json as ApiErrorBody) ?? {} };
  } catch {
    return { ok: false, status: 502, data: null, error: { message: "API unreachable" } };
  }
}

/** Current user (null when anonymous or the token is invalid). Memoised per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!(await getToken())) return null;
  const res = await serverApi<User>("/auth/me");
  return res.ok ? res.data : null;
});