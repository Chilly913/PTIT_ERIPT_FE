import { Suspense } from "react";
import { CoursesListPage, CoursesListSkeleton } from "@/features/courses/courses-list-page";

export default function Page() {
  return (
    <Suspense fallback={<CoursesListSkeleton />}>
      <CoursesListPage />
    </Suspense>
  );
}
