import type { Metadata } from "next";
import { ExamTake } from "@/features/learn/exam-take";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Làm bài thi", robots: { index: false } };

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/exams/${id}`);
  return <ExamTake examId={Number(id)} />;
}
