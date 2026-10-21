import type { ApiErrorBody } from "./types";

/** Error thrown by the `api` helper for every non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;
  /** Seconds from the `Retry-After` header (429). */
  readonly retryAfter?: number;
  readonly requiresVerification: boolean;
  readonly email?: string;

  constructor(
    status: number,
    message: string,
    opts: { errors?: Record<string, string[]>; retryAfter?: number; body?: ApiErrorBody } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = opts.errors;
    this.retryAfter = opts.retryAfter;
    this.requiresVerification = Boolean(opts.body?.requires_verification);
    this.email = opts.body?.email;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}