import { ExamDetailPage } from "@/features/exams/exam-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExamDetailPage examId={id} />;
}
