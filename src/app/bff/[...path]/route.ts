import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/server-config";
import { TOKEN_COOKIE } from "@/lib/config";
import { clearSessionCookie } from "@/lib/session";
import { sameOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

/** Endpoints that hand out a token: must go through /session/* so the token never reaches JS. */
const TOKEN_ENDPOINTS = new Set(["login", "auth/login", "auth/google/callback", "auth/google/redirect", "auth/google/url"]);

const SKIP_REQUEST_HEADERS = new Set([
  "host", "connection", "content-length", "cookie", "authorization", "origin", "referer",
  "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port", "keep-alive", "transfer-encoding", "upgrade",
]);
const SKIP_RESPONSE_HEADERS = new Set([
  "content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive", "set-cookie",
]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, { params }: Ctx) {
  const { path } = await params;
  if (path.some((s) => s === ".." || s === "." || s === "" || s.includes("/") || s.includes("\\"))) {
    return NextResponse.json({ message: "Bad path" }, { status: 400 });
  }
  const joined = path.join("/");
  if (TOKEN_ENDPOINTS.has(joined)) return NextResponse.json({ message: "Not Found" }, { status: 404 });

  const method = request.method;
  if (method !== "GET" && method !== "HEAD" && !sameOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const headers = new Headers();
  request.headers.forEach((v, k) => {
    if (!SKIP_REQUEST_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  });
  const fwd = request.headers.get("x-forwarded-for");
  const ip = fwd ?? request.headers.get("x-real-ip");
  if (ip) headers.set("X-Forwarded-For", ip);
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = method !== "GET" && method !== "HEAD" && request.body !== null;
  const url = `${API_URL}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body: hasBody ? request.body : undefined,
      // @ts-expect-error duplex is required for streamed request bodies (undici)
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "API unreachable" }, { status: 502 });
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!SKIP_RESPONSE_HEADERS.has(k.toLowerCase())) resHeaders.set(k, v);
  });
  resHeaders.set("Cache-Control", "no-store");

  const res = new NextResponse(upstream.status === 204 || upstream.status === 304 ? null : upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
  if (upstream.status === 401 && token) clearSessionCookie(res);
  return res;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as HEAD, proxy as OPTIONS };