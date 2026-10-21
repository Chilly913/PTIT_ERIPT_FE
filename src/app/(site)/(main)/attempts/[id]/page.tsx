import type { Metadata } from "next";
import { AttemptResult } from "@/features/learn/attempt-result";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Kết quả bài làm", robots: { index: false } };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/attempts/${id}`);
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? <AttemptResult attemptId={n} /> : null;
}
