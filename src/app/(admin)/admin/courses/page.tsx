import { Suspense } from "react";
import { AdminCoursesPage, AdminCoursesSkeleton } from "@/features/courses/admin/admin-courses-page";

export default function Page() {
  return (
    <Suspense fallback={<AdminCoursesSkeleton />}>
      <AdminCoursesPage />
    </Suspense>
  );
}
