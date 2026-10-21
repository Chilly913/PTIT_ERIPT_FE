import { Suspense } from "react";
import { GradesPage, GradesSkeleton } from "@/features/grades/grades-page";

export default function Page() {
  return (
    <Suspense fallback={<GradesSkeleton />}>
      <GradesPage />
    </Suspense>
  );
}
