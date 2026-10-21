import { NextResponse, type NextRequest } from "next/server";
import { translateServerMessage } from "@/lib/messages";
import { serverApi } from "@/lib/server-api";

/** GET: ask the API for the Google consent URL and redirect the browser there. */
export async function GET(request: NextRequest) {
  const res = await serverApi<{ url: string }>("/auth/google/url", { token: null });
  const target = new URL("/auth/google", request.url);
  if (!res.ok || !res.data?.url) {
    target.searchParams.set("error", translateServerMessage(res.error?.message, res.status) || "Không thể kết nối tới Google.");
    return NextResponse.redirect(target);
  }
  return NextResponse.redirect(res.data.url);
}