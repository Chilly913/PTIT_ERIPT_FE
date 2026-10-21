import "server-only";

/** Origin of the Go API as seen by the Next.js server. */
export const API_URL = (process.env.API_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");