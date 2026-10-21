import { Suspense } from "react";
import { CourseEditor } from "@/features/courses/editor/course-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <CourseEditor courseId={id} />
    </Suspense>
  );
}
