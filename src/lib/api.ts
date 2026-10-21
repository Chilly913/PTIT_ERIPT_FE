import { ApiError } from "./errors";
import type { ApiErrorBody } from "./types";
import { messages, translateServerMessage } from "./messages";

export { ApiError, isApiError } from "./errors";

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  query?: Query;
  /** Plain objects are sent as JSON, FormData as multipart. */
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function withQuery(url: string, query?: Query) {
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

/** Low-level request against an absolute app path (e.g. `/session/login`). */
export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body; // browser sets the multipart boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(withQuery(url, opts.query), {
      method,
      headers,
      body,
      signal: opts.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, messages.common.networkError);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    const b = (data ?? {}) as ApiErrorBody;
    const retry = Number(res.headers.get("Retry-After"));
    // Session expired: the BFF already cleared the cookie.
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/session/") && !url.startsWith("/bff/auth/")) {
      const next = window.location.pathname + window.location.search;
      // Full reload on purpose: drops all client state of the expired session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    }
    throw new ApiError(res.status, translateServerMessage(b.message, res.status), {
      errors: b.errors && Object.fromEntries(Object.entries(b.errors).map(([k, v]) => [k, v.map((m) => translateServerMessage(m))])),
      retryAfter: Number.isFinite(retry) && retry > 0 ? retry : undefined,
      body: b,
    });
  }
  return data as T;
}

const bff = (path: string) => `/bff${path.startsWith("/") ? path : `/${path}`}`;

/** Typed helper over the authenticated BFF proxy (`/bff/*` -> Go `/api/*`). */
export const api = {
  get: <T>(path: string, opts?: RequestOptions) => apiRequest<T>("GET", bff(path), opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>("POST", bff(path), { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>("PUT", bff(path), { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>("PATCH", bff(path), { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => apiRequest<T>("DELETE", bff(path), opts),
};