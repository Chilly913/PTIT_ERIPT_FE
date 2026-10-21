import { Suspense } from "react";
import { ExamsPage, ExamsSkeleton } from "@/features/exams/exams-page";

export default function Page() {
  return (
    <Suspense fallback={<ExamsSkeleton />}>
      <ExamsPage />
    </Suspense>
  );
}
