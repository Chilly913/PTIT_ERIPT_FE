import { Suspense } from "react";
import { GradingPage, GradingSkeleton } from "@/features/grading/grading-page";

export default function Page() {
  return (
    <Suspense fallback={<GradingSkeleton />}>
      <GradingPage />
    </Suspense>
  );
}
