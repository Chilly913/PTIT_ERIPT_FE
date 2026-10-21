/** Shared (client + server) constants. Server-only values live in server-config.ts. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "ERIPT";

/** Name of the httpOnly cookie that holds the Go bearer token. */
export const TOKEN_COOKIE = "eript_token";

/** URL prefixes that require a session (checked in proxy.ts and in layouts). */
export const PROTECTED_PREFIXES = ["/admin"] as const;