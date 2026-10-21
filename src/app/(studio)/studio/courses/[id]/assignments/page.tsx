import { Suspense } from "react";
import { AssignmentsPage } from "@/features/courses/assignments-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <AssignmentsPage courseId={id} />
    </Suspense>
  );
}
