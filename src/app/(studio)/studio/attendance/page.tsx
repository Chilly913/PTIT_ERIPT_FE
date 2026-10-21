import { Suspense } from "react";
import { AttendancePage, AttendanceSkeleton } from "@/features/attendance/attendance-page";

export default function Page() {
  return (
    <Suspense fallback={<AttendanceSkeleton />}>
      <AttendancePage />
    </Suspense>
  );
}
