import { Suspense } from "react";
import { ClassesPage, ClassesSkeleton } from "@/features/classes/classes-page";

export default function Page() {
  return (
    <Suspense fallback={<ClassesSkeleton />}>
      <ClassesPage />
    </Suspense>
  );
}
